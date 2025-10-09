import { ReactWidget } from '@jupyterlab/ui-components';

import { CellNode, CellNodeWidget } from './cell-node-widget';

import React, { useCallback } from 'react';
import { ToolBar } from './tool-bar';
import { getLayoutedElements } from './layout';

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
import { NotebookPanel } from '@jupyterlab/notebook';
import { computeEdges } from './yw-core';

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

  const onDebug = () => {
    console.log('[Debug] Nodes: ', nodes);
    console.log('[Debug] Edges: ', edges);
  };

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
          <ToolBar onClickLayout={onLayout} onClickDebug={onDebug} />
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

    // initialize default nodes and prepare it to list for yw-core
    const cells = this.notebook.content.widgets.filter(cell => {
      return cell.model.type === 'code';
    });
    const ywCoreCodeCellList: string[] = [];
    cells.forEach((cell, index) => {
      let cellMeta = cell.model.toJSON();
      this.defaultNodes.push({
        id: `${index}`,
        type: 'cell',
        position: {x: 0, y: 0},
        data: {
          exec_count: 0,
          header: `Cell ${index}`,
          code_block: cellMeta.source,
          status: 'not-execute'
        }
      });

      // join string array to string and append it to list
      if (typeof cellMeta.source === 'string') {
        ywCoreCodeCellList.push(cellMeta.source);
      } else {
        ywCoreCodeCellList.push(cellMeta.source.join('\n'));
      }
    });

    // compute the edges using yw-core
    // TODO: without edges the layout is probably not correct.
    computeEdges(
      this.notebook.sessionContext.session?.kernel,
      ywCoreCodeCellList
    ).then((edges) => {
      console.log('Computed edges: ', edges);
      edges.forEach(edge => {
        this.defaultEdges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          markerEnd: {type: MarkerType.ArrowClosed}
        });
      });
    });
  }

  render(): JSX.Element {
    return (
      <App defaultNodes={this.defaultNodes} defaultEdges={this.defaultEdges} />
    );
  }
}
