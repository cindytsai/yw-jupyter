import {ReactWidget} from '@jupyterlab/ui-components';

import {CellNode, CellNodeWidget} from './cell-node-widget';

import React, {useCallback} from 'react';
import {ToolBar} from './tool-bar';
import {getLayoutedElements} from './layout';

import {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import {NotebookPanel} from '@jupyterlab/notebook';

const nodeTypes = {
  cell: CellNodeWidget
};

interface AppProps {
  defaultNodes: CellNode[];
  defaultEdges: Edge[];
}

function App({ defaultNodes, defaultEdges }: AppProps): JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const onLayout = useCallback(() => {
    getLayoutedElements(nodes, edges).then(obj => {
      setNodes(obj['nodes']);
      setEdges(obj['edges']);
      console.log(obj['nodes']);
      console.log(obj['edges']);
    });
  }, [nodes, edges]);

  // TODO: Calculate the initial layout on mount.

  // defaultNodes only used for initial rendering
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        defaultNodes={defaultNodes}
        defaultEdges={defaultEdges}
        nodeTypes={nodeTypes}
        fitView
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      >
        <Panel>
          <ToolBar onClick={onLayout} />
        </Panel>
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
  readonly notebook: NotebookPanel; // cannot be null
  defaultNodes: CellNode[] = [];
  defaultEdges: Edge[] = [];

  constructor(notebook: NotebookPanel) {
    super();
    this.addClass('jp-react-widget');
    this.notebook = notebook;
    this.notebookID = notebook.id;
    console.log('Constructing YWWidget with notebookID: ', this.notebookID);
    console.log('Constructing YWWidget with notebook: ', this.notebook);

    // initialize default nodes
    const cells = this.notebook.content.widgets.filter(cell => {
      return cell.model.type === 'code';
    });
    cells.forEach((cell, index) => {
      let cellMeta = cell.model.toJSON();
      this.defaultNodes.push({
        id: `${index}`,
        type: 'cell',
        position: { x: 0, y: 0 },
        data: {
          exec_count: 0,
          header: `Cell ${index}`,
          code_block: cellMeta.source,
          status: 'not-execute'
        }
      });

      // TODO: compute the edges through yw-generator
      if (index > 0) {
        this.defaultEdges.push({
          id: `e${index - 1}-${index}`,
          source: `${index - 1}`,
          target: `${index}`,
          markerEnd: {type: MarkerType.ArrowClosed}
        })
      }
    });
  }

  render(): JSX.Element {
    return (
      <App defaultNodes={this.defaultNodes} defaultEdges={this.defaultEdges} />
    );
  }
}
