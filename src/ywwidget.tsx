import { ReactWidget } from '@jupyterlab/ui-components';

import { CellNodeWidget } from './cell-node-widget';

import React from 'react';

import { CellNode } from './cell-node-widget';

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  cell: CellNodeWidget
};

interface AppProps {
  defaultNodes: CellNode[];
}

function App({ defaultNodes }: AppProps): JSX.Element {
  console.log('defaultNodes: ', defaultNodes);
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
  defaultNodes: CellNode[];

  constructor(notebookID: string) {
    super();
    this.addClass('jp-react-widget');
    this.notebookID = notebookID;

    // initialize default nodes
    // TODO: call
    //  const cells = this.notebook.content.widgets.filter(cell => {
    //       return cell.model.type === 'code';
    //     });
    //
    //     console.log('YWWidget observes notebook and calls updateView: ');
    //     cells.forEach(cell => {
    //       console.log(cell.model.toJSON());
    //     });
    console.log('Constructing YWWidget with notebookID: ', notebookID);
    this.defaultNodes = [
      {
        id: '1',
        type: 'cell',
        position: { x: 0, y: 0 },
        data: {
          exec_count: 0,
          header: 'Cell 1',
          code_block: 'print("Hello, World!")',
          status: 'not-execute'
        }
      }
    ];
  }

  render(): JSX.Element {
    console.log('Rendering YWWidget with defaultNodes: ', this.defaultNodes);
    return <App defaultNodes={this.defaultNodes} />;
  }
}
