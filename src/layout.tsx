import ELK from 'elkjs/lib/elk.bundled.js';
import { CellNode } from './cell-node-widget';
import { Edge } from '@xyflow/react';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80'
};

export const getLayoutedElements = (nodes: CellNode[], edges: Edge[]) => {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node: CellNode) => ({
      ...node,
      // Adjust the target and source handle positions based on the layout
      // direction.
      targetPosition: 'top',
      sourcePosition: 'bottom',

      // Hardcode a width and height for elk to use when layouting.
      width: 150,
      height: 50
    })),
    edges: edges.map((edge: Edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  return elk
    .layout(graph)
    .then(layoutedGraph => ({
      nodes: layoutedGraph.children?.map(node => ({
        ...node,
        // React Flow expects a position property on the node instead of `x`
        // and `y` fields.
        position: { x: node.x, y: node.y }
      })),
      edges: layoutedGraph.edges.map(edge => ({
        id: edge.id,
        source: edge.sources[0],
        target: edge.targets[0]
      }))
    }))
    .catch(console.error);
};
