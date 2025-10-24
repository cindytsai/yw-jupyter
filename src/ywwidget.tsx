import { ReactWidget } from '@jupyterlab/ui-components';

import { CellNode, CellNodeWidget } from './cell-node-widget';

import React, { useCallback, useEffect } from 'react';
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
  useNodesState,
  useReactFlow
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import {NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { computeEdges } from './yw-core';

const nodeTypes = {
  cell: CellNodeWidget
};

interface AppProps {
  ywwidget: YWWidget;
}

type ReactFlowControllerType = {
  focusAndSelectNode?: (nodeID: string) => void;
};

const reactflowController: ReactFlowControllerType = {};

function App({ ywwidget }: AppProps): JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState(ywwidget.defaultNodes);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const {getNode, setCenter} = useReactFlow();

  // On node double click handler
  const onNodeDoubleClick = (event: React.MouseEvent, node: CellNode) => {
    console.log("[App] Node double-clicked: ", node);
    ywwidget.focusCell(node.data.order_index);
  };

  // Update edges when ywwidget.Edges changes
  useEffect(() => {
    console.log('[App] useEffect triggered by ywwidget.Edges change');
    setEdges(ywwidget.Edges);
  }, [ywwidget.Edges]);

  // Layout button handler
  const onLayoutButton = useCallback(() => {
    getLayoutedElements(nodes, edges).then(obj => {
      setNodes(obj['nodes']);
      setEdges(obj['edges']);
      console.log(obj['nodes']);
      console.log(obj['edges']);
    });
  }, [nodes, edges]);

  // Debug button handler
  const onDebugButton = () => {
    console.log('[Debug] Nodes: ', nodes);
    console.log('[Debug] Edges: ', edges);
  };

  // focus and select node and expose the function
  const focusAndSelectNode = useCallback(
    (nodeID: string) => {
      const node = getNode(nodeID);
      if (node) {
        const zoom = 1.5;
        setCenter(
          node.position.x + (node.measured?.width || 0) / 2,
          node.position.y + (node.measured?.height || 0) / 2,
          {zoom: zoom, duration: 800},
        );
        // setNodes((nodes) => nodes.map((n) => {...n}))
      } else {
        return
      }
    },
    [getNode, setCenter, setNodes]
  );
  useEffect(() => {
    reactflowController.focusAndSelectNode = focusAndSelectNode;
    return () => {
      delete reactflowController.focusAndSelectNode;
    }
  }, []);

  // TODO: Calculate the initial layout on mount.

  // defaultNodes only used for initial rendering
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        defaultNodes={ywwidget.defaultNodes}
        nodeTypes={nodeTypes}
        fitView
        onNodesChange={onNodesChange}
        onNodeDoubleClick={onNodeDoubleClick}
      >
        <Panel>
          <ToolBar
            onClickLayout={onLayoutButton}
            onClickDebug={onDebugButton}
          />
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
  Edges: Edge[] = [];

  constructor(notebook: NotebookPanel) {
    super();
    this.addClass('jp-react-widget');
    this.notebook = notebook;
    this.notebookID = notebook.id;
    console.log('Constructing YWWidget with notebookID: ', this.notebookID);
    console.log('Constructing YWWidget with notebook: ', this.notebook);

    // initialize default nodes and prepare it to list for yw-core
    const ywCoreCodeCellList: string[] = [];
    let codeCellIndex = 0;
    this.notebook.content.widgets.forEach((cell, index) => {
      if (cell.model.type !== 'code') {
        return;
      } else {
        let cellMeta = cell.model.toJSON();
        this.defaultNodes.push({
          id: `${codeCellIndex}`,
          type: 'cell',
          position: { x: 0, y: 0 },
          data: {
            order_index: index,
            exec_count: 0,
            header: `Cell ${index}`,
            code_block: cellMeta.source,
            status: 'not-execute'
          }
        });
        codeCellIndex += 1;

        // join string array to string and append it to list
        if (typeof cellMeta.source === 'string') {
          ywCoreCodeCellList.push(cellMeta.source);
        } else {
          ywCoreCodeCellList.push(cellMeta.source.join('\n'));
        }
      }
    });

    // compute the edges using yw-core
    computeEdges(
      this.notebook.sessionContext.session?.kernel,
      ywCoreCodeCellList
    ).then(edges => {
      console.log('[YWWidget] Computed edges: ', edges);
      edges.forEach(edge => {
        this.Edges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed }
        });
      });
    });
    console.log('[YWWidget] end of constructor');
  }

  focusCell(cellIndex: number) {
    this.notebook.content.activeCellIndex = cellIndex;
    NotebookActions.focusActiveCell(this.notebook.content);
    console.log('[YWWidget] focusCell: ', cellIndex);
  }

  focusYWNode(cellIndex: number | undefined) {
    console.log('[YWWidget] focusYWNode: ', cellIndex);
    // find the node with the given ID
    const node = this.defaultNodes.find(n => n.data.order_index === cellIndex);
    if (node) {
      console.log('[YWWidget] Found node: ', node);
      reactflowController.focusAndSelectNode?.(node.id);
    }
  }

  render(): JSX.Element {
    console.log('[YWWidget] render()');
    return <App ywwidget={this} />;
  }
}
