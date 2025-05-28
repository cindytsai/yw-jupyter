import { ReactWidget } from '@jupyterlab/ui-components';

import NodeHeaderDemoNode from './cell-node';

import React from 'react';

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  nodeHeaderNode: NodeHeaderDemoNode
};

const defaultNodes = [
  {
    id: '1',
    type: 'nodeHeaderNode',
    position: { x: 200, y: 200 },
    data: {}
  }
];

function App() {
  return (
    <ReactFlowProvider>
      <ReactFlow defaultNodes={defaultNodes} nodeTypes={nodeTypes} fitView>
        <MiniMap pannable zoomable />
        <Controls />
        <Background />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

/**
 * A YWWidget that visualizes YesWorkflow data in a ReactFlow graph.
 */
export class YWWidget extends ReactWidget {
  readonly notebookID: string;

  constructor(notebookID: string) {
    super();
    this.addClass('jp-react-widget');
    this.notebookID = notebookID;
  }

  render(): JSX.Element {
    return <App />;
  }
}
