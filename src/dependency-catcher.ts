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
  cellID: string,
  exec_count: number,
  nodes: CellNode[]
): Promise<IYWEdge[]> {
  if (!kernel) {
    return [];
  }
  console.log('[ipyflow] ', { exec_count });
  const py_ipyflow_cells_wrapper: string = `
from ipyflow import cells
print(list(cells(${exec_count}).slice().raw_slice))
`;
  return new Promise<IYWEdge[]>(resolve => {
    const dep_result = kernel.requestExecute({
      code: py_ipyflow_cells_wrapper,
      silent: false,
      store_history: false
    });

    let output_raw: string | string[] | null | undefined = null;
    dep_result.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
      if (msg.header.msg_type === 'stream') {
        const content = msg.content as IStream;
        output_raw = content.text;
        resolve(parseIPyFlowOutput(output_raw, cellID, exec_count, nodes));
      }
    };
  });
}

function parseIPyFlowOutput(
  output_raw: string | string[] | null | undefined,
  cellID: string,
  my_exe_count: number,
  nodes: CellNode[]
): IYWEdge[] {
  if (output_raw) {
    let output: string;
    if (Array.isArray(output_raw)) {
      output = output_raw.join(' ');
    } else {
      output = output_raw;
    }
    const dep_arr = JSON.parse(output);
    const edges: IYWEdge[] = [];
    for (let i = 0; i < dep_arr.length - 1; i++) {
      const source = nodes.find(
        node => node.data.exec_count === dep_arr[i]
      )?.id;

      // the last target (which is always the cell itself) execute count
      // may not always be up to date, so we read from my_exe_count
      const target =
        nodes.find(n => n.data.exec_count === dep_arr[i + 1])?.id ??
        nodes.find(n => n.data.cell_id === cellID)?.id;
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
