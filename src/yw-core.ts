import { Kernel, KernelMessage } from '@jupyterlab/services';
import { Notification } from '@jupyterlab/apputils';
import { IStream } from '@jupyterlab/nbformat';

export interface YWEdge {
  id: string;
  source: string;
  target: string;
}

const py_parse_yw_core: string = `
def parse_yw_core(yw_records: list):
    """Return a list of edges, the length is not necessary equal to the number of cells
    [{"source": cell_number, "target": cell_number}]
    """

    def get_object_name(obj: dict, keys: list):
        """Read dictionary's key-value pair, and concate and return the values as a list"""
        object_list = []
        
        for key in keys:
            if key in obj:
                for o in list(obj[key]):
                    object_list.append(o)
    
        return object_list

    block_table = {}
    edges = []
    
    for cell_index, obj in enumerate(yw_records):
        # lookup input candidate in the table and create the edge
        input_objects = get_object_name(obj, ["inputs"])
        for io in input_objects:
            if io in block_table:
                edge = {"source": block_table[io], "target": cell_index}
                edges.append(edge)
        
        # update block_table using output and output candidate
        output_objects = get_object_name(obj, ["outputs", "output_candidates"])
        for oo in output_objects:
            block_table[oo] = cell_index
    
    return edges
`;

/**
 * Main API for compute the edges for the YesWorkflow visualization.
 * Must have a kernel with yw-core installed.
 * @note currently, we rely on printing the result to stdout and then parse it.
 * @todo need to create a temporary storage for cells data, so that we don't overwrite existing Python objects
 * @param kernel kernel connection to call yw-core
 * @param input_cells list of code string in each cell
 * @param yw_core_estimate "Upper" or "Lower" estimate, default to "Upper"
 * @returns YWEdge[] computed by yw-core
 */
export async function computeEdges(
  kernel: Kernel.IKernelConnection | undefined | null,
  input_cells: string[],
  yw_core_estimate: 'Upper' | 'Lower' = 'Upper'
): Promise<YWEdge[]> {
  if (!kernel) {
    Notification.error(
      'No kernel connection available to compute edges.\n' +
        'Please select a kernel with Python package yw-core installed.',
      { autoClose: 3000 }
    );
    return [];
  }

  // load input cells to Python, and create cell_list = [list of cell_i]
  let py_cell_list = '';
  input_cells.forEach((cell, index) => {
    const py_cell = `cell_${index} = """${cell}"""\n`; // TODO: might encounter issues if triple quotes are in the code
    py_cell_list += `cell_${index},`;
    kernel.requestExecute({
      code: py_cell,
      silent: false,
      store_history: false
    });
  });
  kernel.requestExecute({
    code: 'cell_list = [' + py_cell_list + ']\n',
    silent: false,
    store_history: false
  });

  // call yw-core to compute edges silently
  const is_upper_estimate = yw_core_estimate === 'Upper' ? 'True' : 'False';
  const py_yw_core =
    `from yw_core.yw_core import extract_records\n` +
    `${py_parse_yw_core}\n` +
    `yw_records = extract_records(cell_list, is_upper_estimate=${is_upper_estimate})\n` +
    `print(parse_yw_core(yw_records))\n`;
  const exec_result = kernel.requestExecute({
      code: py_yw_core,
      silent: false,
      store_history: false
  });
  let output_raw: string | string[] | null | undefined = null;

  exec_result.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream') {
      const content = msg.content as IStream;
      output_raw = content.text;

      // parse the output and return
      parseYWCoreOutput(output_raw);
    }
  };

  // clear the Python object (currently, python objects are hardcoded to cell_i and cell_list)
  // TODO: can I make this prettier?
  input_cells.forEach((cell, index) => {
    kernel.requestExecute({
      code: `del(cell_${index})`,
      silent: false,
      store_history: false
    });
  });
  kernel.requestExecute({
    code: 'del(cell_list)\n',
    silent: false,
    store_history: false
  });
  kernel.requestExecute({
    code: 'del(extract_records);del(parse_yw_core)\n',
    silent: false,
    store_history: false
  });

  return [{ id: 'e0-1', source: '0', target: '1' }];
}

/**
 * Parse the output from yw-core and parse_yw_core Python function,
 * and convert it to YWEdge.
 * @param output_raw
 */
function parseYWCoreOutput(
  output_raw: string | string[] | null | undefined
): YWEdge[] {
  if (output_raw) {
    let output: string;
    if (Array.isArray(output_raw)) {
      output = output_raw.join(" ");
    } else {
      output = output_raw;
    }
    output = output?.replace(/'/g, '"');
    const json_output = JSON.parse(output);
    let edges: YWEdge[] = [];
    json_output.forEach((edge: YWEdge) => {
      edges.push({ id: `e${edge.source}-${edge.target}`, source: `${edge.source}`, target: `${edge.target}` });
    });
    return edges;
  } else {
    return [];
  }
}
