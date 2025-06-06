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
import { NotebookPanel } from '@jupyterlab/notebook';

const nodeTypes = {
  cell: CellNodeWidget
};

interface AppProps {
  defaultNodes: CellNode[];
}

function App({ defaultNodes }: AppProps): JSX.Element {
  // defaultNodes only used for initial rendering
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
  readonly notebook: NotebookPanel;
  defaultNodes: CellNode[];

  constructor(notebook: NotebookPanel) {
    super();
    this.addClass('jp-react-widget');
    this.notebook = notebook;
    this.notebookID = notebook.id;

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
    console.log('Constructing YWWidget with notebookID: ', this.notebookID);
    console.log('Constructing YWWidget with notebook: ', this.notebook);
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
    return <App defaultNodes={this.defaultNodes} />;
  }
}
