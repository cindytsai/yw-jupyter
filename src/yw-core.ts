import { Kernel } from '@jupyterlab/services';
import { Notification } from '@jupyterlab/apputils';

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

  return [{ id: 'e0-1', source: '0', target: '1' }];
}
