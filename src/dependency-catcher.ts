import { Kernel } from '@jupyterlab/services';
import { IYWEdge } from './yw-core';
import { CellNode } from './cell-node-widget';

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

  const future = kernel.requestExecute({
    code: '',
    user_expressions: {
      dep: `[_.id for _ in cells(${exec_count}).parents.keys()]`
    },
    silent: true,
    store_history: false
  });

  const reply = await future.done;
  const expr = (reply?.content as any)?.user_expressions?.dep;
  console.log('[computeDeps] user_expressions reply:', expr);

  if (expr?.status === 'error') {
    console.warn('[computeDeps] ipyflow query failed:', expr);
    return [];
  }

  const raw: string | undefined = expr?.data?.['text/plain'];
  return parseIPyFlowOutput(raw, cell_id, nodes);
}

function parseIPyFlowOutput(
  output_raw: string | undefined,
  cell_id: string,
  nodes: CellNode[]
): IYWEdge[] {
  if (output_raw) {
    const output: string = output_raw.replace(/'/g, '"');
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
