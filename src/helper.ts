import { INotebookTracker } from '@jupyterlab/notebook';
import { Edge } from '@xyflow/react';
import { IYWEdge } from '@/yw-core';
let _tracker: INotebookTracker | null = null;

export const setNotebookTracker = (tracker: INotebookTracker) => {
  _tracker = tracker;
  console.log('[setNotebookTracker] ', _tracker);
};

export const getNotebookAndCellById = (notebookID: string, cellID: string) => {
  const notebookPanel =
    _tracker?.find(panel => panel.id === notebookID) ?? null;
  if (notebookPanel) {
    const cell = notebookPanel.content.widgets.find(
      cell => cell.model.id === cellID
    );
    if (cell) {
      return { notebookPanel: notebookPanel, cell: cell };
    } else {
      return { notebookPanel: notebookPanel, cell: undefined };
    }
  } else {
    return { notebookPanel: null, cell: undefined };
  }
};

/**
 * Return the target node's upstream nodes and edges, the returned nodes doesn't include the target node itself.
 * @param nodeId target node id
 * @param edges pass in all edges to find the upstream nodes and edges of the target node
 * @param select select the edges type
 */
export const getUpstreamNodeIdsAndEdgesIds = (
  nodeId: string,
  edges: Edge[],
  select: 'all' | 'guessed' | 'definite' = 'all'
): { nodes: Set<string>; edges: Set<string> } => {
  const upstreamNodes = new Set<string>();
  const upstreamEdges = new Set<string>();
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    edges.forEach(edge => {
      if (edge.target === current) {
        const depType = (edge as IYWEdge)?.dep_type;
        if (
          select === 'all' ||
          (select === 'guessed' && depType === 'guessed') ||
          (select === 'definite' && depType === 'definite')
        ) {
          upstreamNodes.add(edge.source);
          upstreamEdges.add(edge.id);
          queue.push(edge.source);
        }
      }
    });
  }
  return { nodes: upstreamNodes, edges: upstreamEdges };
};
