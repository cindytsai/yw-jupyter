import { Kernel, KernelMessage } from '@jupyterlab/services';
import { Notification } from '@jupyterlab/apputils';
import { IOutput } from '@jupyterlab/nbformat';

export interface YWEdge {
  id: string;
  source: string;
  target: string;
}

// TODO: compute the edges using yw-core
/**
 * Compute the edges for the YesWorkflow visualization.
 */
export function computeEdges(
  kernel: Kernel.IKernelConnection | undefined | null,
  input_cells: string[]
): YWEdge[] {
  if (!kernel) {
    Notification.error(
      'No kernel connection available to compute edges.\n' +
        'Please select a kernel with Python package yw-core installed.',
      { autoClose: 3000 }
    );
    return [];
  }

  // call yw-core to compute edges silently
  const test_code =
    "import ast, sys\nast.parse('a=1')\nprint('hello world')" +
    "\nprint(sys.version)\n";
  const exec_result = kernel.requestExecute({code: test_code, silent:false, store_history: false});
  console.log('[computeEdges] ', exec_result);
  exec_result.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    if (msg.header.msg_type === 'stream') {
      const content = msg.content as IOutput;
      console.log('[computeEdges] stream: ', content);
    }
  }

  return [{ id: 'e0-1', source: '0', target: '1' }];
}
