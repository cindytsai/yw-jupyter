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
  cell_id: string,
  exec_count: number,
  nodes: CellNode[]
): Promise<IYWEdge[]> {
  if (!kernel) {
    return [];
  }
  console.log('[ipyflow] ', { exec_count });
  const py_ipyflow_cells_wrapper: string = `
DEP = []
for _ in cells(${exec_count}).parents.keys():
    DEP.append(_.id)
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
        resolve(parseIPyFlowOutput(output_raw, cell_id, nodes));
      }
    };
  });
}

function parseIPyFlowOutput(
  output_raw: string | string[] | null | undefined,
  cell_id: string,
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
    const target = nodes.find(n => n.data.cell_id === cell_id)?.id;
    for (let i = 0; i < dep_arr.length; i++) {
      const source = nodes.find(node => node.data.cell_id === dep_arr[i])?.id;
      if (target && source) {
        edges.push({
          id: `e${source}-${target}`,
          source: `${source}`,
          target: `${target}`,
          dep_type: 'definite'
        });
      }
    }
    return edges;
  } else {
    return [];
  }
}
