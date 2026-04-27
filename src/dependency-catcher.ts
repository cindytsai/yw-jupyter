import { Kernel, KernelMessage } from '@jupyterlab/services';
import { IYWEdge } from './yw-core';
import { IStream } from '@jupyterlab/nbformat';

/**
 *
 * @param kernel
 * @param exec_count
 */
export async function computeDeps(
  kernel: Kernel.IKernelConnection | undefined | null,
  exec_count: number
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
      console.log('[ipyflow] msg:', msg);
      if (msg.header.msg_type === 'stream') {
        const content = msg.content as IStream;
        output_raw = content.text;
        console.log('[ipyflow] output: ', output_raw);
      }
    };
    resolve([]);
  });
}
