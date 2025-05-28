import { ReactWidget } from '@jupyterlab/ui-components';

import NodeHeaderDemoNode from './cell-node';

import React from 'react';

import '../style/index.css';
import {Background, ReactFlow} from "@xyflow/react";

const nodeTypes = {
  nodeHeaderNode: NodeHeaderDemoNode,
};

const defaultNodes = [
  {
    id: "1",
    type: "nodeHeaderNode",
    position: { x: 200, y: 200 },
    data: {},
  },
];

function App() {
  return (
      <ReactFlow defaultNodes={defaultNodes} nodeTypes={nodeTypes} fitView>
        <Background />
      </ReactFlow>
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
