import { Kernel, KernelMessage } from '@jupyterlab/services';
import { IYWEdge } from './yw-core';
import { IStream } from '@jupyterlab/nbformat';
import { CellNode } from './cell-node-widget';

/**
 *
 * @param kernel
 * @param exec_count
 */
export async function computeDeps(
  kernel: Kernel.IKernelConnection | undefined | null,
  exec_count: number,
  nodes: CellNode[]
): Promise<IYWEdge[]> {
  if (!kernel) {
    return [];
  }
  console.log('[ipyflow] ', { exec_count });
  const py_ipyflow_cells_wrapper: string = `
from ipyflow import cells
DEP = []
for exec_num in cells(${exec_count}).slice().raw_slice.keys():
    DEP.append(cells().at_counter(exec_num).cell_id)
print(DEP)
del(DEP)
`;
  return new Promise<IYWEdge[]>(resolve => {
    const dep_result = kernel.requestExecute({
      code: py_ipyflow_cells_wrapper,
      silent: false,
      store_history: false
    });

    let output_raw: string | string[] | null | undefined = null;
    dep_result.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
      console.log('[onIOPub] ', msg.header);
      console.log('[onIOPub] ', msg.content);
      if (msg.header.msg_type === 'stream') {
        const content = msg.content as IStream;
        output_raw = content.text;
        resolve(parseIPyFlowOutput(output_raw, nodes));
      }
    };
  });
}

function parseIPyFlowOutput(
  output_raw: string | string[] | null | undefined,
  nodes: CellNode[]
): IYWEdge[] {
  if (output_raw) {
    let output: string;
    if (Array.isArray(output_raw)) {
      output = output_raw.join(' ');
    } else {
      output = output_raw;
    }
    output = output?.replace(/'/g, '"');
    const dep_arr: string = JSON.parse(output);
    const edges: IYWEdge[] = [];
    for (let i = 0; i < dep_arr.length - 1; i++) {
      const source = nodes.find(node => node.data.cell_id === dep_arr[i])?.id;
      const target = nodes.find(n => n.data.cell_id === dep_arr[i + 1])?.id;
      edges.push({
        id: `e${source}-${target}`,
        source: `${source}`,
        target: `${target}`
      });
    }
    return edges;
  } else {
    return [];
  }
}
