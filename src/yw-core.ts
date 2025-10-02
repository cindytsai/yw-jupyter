import { Kernel, KernelMessage } from '@jupyterlab/services';
import { Notification } from '@jupyterlab/apputils';
import { IStream } from '@jupyterlab/nbformat';

export interface YWEdge {
  id: string;
  source: string;
  target: string;
}

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
export function computeEdges(
  kernel: Kernel.IKernelConnection | undefined | null,
  input_cells: string[],
  yw_core_estimate: 'Upper' | 'Lower' = 'Upper'
): YWEdge[] {
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
    `print(extract_records(cell_list, is_upper_estimate=${is_upper_estimate}))\n`;
  const exec_result = kernel.requestExecute({
    code: py_yw_core,
    silent: false,
    store_history: false
  });
  console.log('[computeEdges] ', exec_result);
  let output: string | string[] | null | undefined = null;
  exec_result.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream') {
      const content = msg.content as IStream;
      output = content.text;
      console.log('[computeEdges] stream output: ', output);
    }
  };

  // clear the Python object (currently, python objects are hardcoded to cell_i and cell_list)
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

  // parse the output and return
  return parseYWCoreOutput(output);
}

/**
 * // TODO: compute the edges using yw-core
 * @param output
 */
function parseYWCoreOutput(
  output: string | string[] | null | undefined
): YWEdge[] {
  return [{ id: 'e0-1', source: '0', target: '1' }];
}
