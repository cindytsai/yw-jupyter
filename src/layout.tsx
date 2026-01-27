import ELK from 'elkjs/lib/elk.bundled.js';
import { CellNode } from './cell-node-widget';
import { Edge, MarkerType } from '@xyflow/react';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '80'
};

/**
 * Get the layouted elements using ELK.
 * This function takes CellNode and Edge arrays used in React Flow and returns
 * the layouted CellNode and Edge arrays passed in with the `position` changed.
 * @todo currently, I'm mapping the nodes/edges to the format ELK back-and-forth
 *       by hand.
 * @param nodes
 * @param edges
 */
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
      width: node.measured?.width || 200,
      height: node.measured?.height || 50
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
        target: edge.targets[0],
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed
        }
      }))
    }))
    .catch(console.error);
};
