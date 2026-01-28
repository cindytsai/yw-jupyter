import { ReactWidget } from '@jupyterlab/ui-components';

import { CellNode, CellNodeWidget } from './cell-node-widget';

import React, { ChangeEvent, useCallback, useEffect } from 'react';
import { DebugToolBar, ToolBar } from './tool-bar';
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
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { computeEdges } from './yw-core';

const nodeTypes = {
  cell: CellNodeWidget
};

interface AppProps {
  ywwidget: YWWidget;
}

type ReactFlowControllerType = {
  focusAndSelectNode?: (nodeID: string) => void;
  updateCellNodeContent?: (nodeID: string, content: string | string[]) => void;
};

const reactflowController: ReactFlowControllerType = {};

function App({ ywwidget }: AppProps): JSX.Element {
  // ywwidget.Nodes and ywwidget.Edges are only for initialization
  const [nodes, setNodes, onNodesChange] = useNodesState(ywwidget.Nodes);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { getNode, setCenter } = useReactFlow();

  // On node double click handler
  const onNodeDoubleClick = (event: React.MouseEvent, node: CellNode) => {
    console.log('[App] Node double-clicked: ', node);
    ywwidget.focusCell(node.data.order_index);
  };

  // Compute the edges on first launch
  useEffect(() => {
    console.log('[App] Compute edges on first launch');
    computeEdges(ywwidget.notebook.sessionContext.session?.kernel, nodes).then(
      computedEdges => {
        setEdges(
          computedEdges.map(edge => ({
            ...edge,
            type: 'default',
            markerEnd: MarkerType.ArrowClosed
          }))
        );
      }
    );
  }, []);

  // Layout (edge compute) selection change handler
  // TODO: avoid nested then()
  const onLayoutSelectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    console.log('[ToolBar] Selected value: ', event.target.value);
    if (event.target.value === 'Lower' || event.target.value === 'Upper') {
      computeEdges(
        ywwidget.notebook.sessionContext.session?.kernel,
        nodes,
        event.target.value
      ).then(computedEdges => {
        ywwidget.Edges = [];
        computedEdges.forEach(edge => {
          ywwidget.Edges.push({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'default',
            markerEnd: { type: MarkerType.ArrowClosed }
          });
        });
        getLayoutedElements(nodes, edges).then(obj => {
          setNodes(obj['nodes']);
          setEdges(obj['edges']);
        });
      });
    }
  };

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
          { zoom: zoom, duration: 800 }
        );
        // setNodes((nodes) => nodes.map((n) => {...n}))
      } else {
        return;
      }
    },
    [getNode, setCenter, setNodes]
  );
  useEffect(() => {
    reactflowController.focusAndSelectNode = focusAndSelectNode;
    return () => {
      delete reactflowController.focusAndSelectNode;
    };
  }, []);

  // On Node content change
  const updateCellNodeContent = useCallback(
    (nodeID: string, content: string | string[]) => {
      setNodes(nds =>
        nds.map(node => {
          if (node.id === nodeID) {
            return {
              ...node,
              data: {
                ...node.data,
                code_block: content
              }
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  useEffect(() => {
    reactflowController.updateCellNodeContent = updateCellNodeContent;
    return () => {
      delete reactflowController.updateCellNodeContent;
    };
  }, []);

  // TODO: Calculate the initial layout on mount.

  // defaultNodes only used for initial rendering
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      defaultNodes={ywwidget.Nodes}
      nodeTypes={nodeTypes}
      fitView
      onNodesChange={onNodesChange}
      onNodeDoubleClick={onNodeDoubleClick}
    >
      <Panel position="top-left">
        <ToolBar
          onLayoutSelectionChange={onLayoutSelectionChange}
          onClickLayout={onLayoutButton}
        />
      </Panel>
      <Panel position="top-right">
        <DebugToolBar onClickDebug={onDebugButton} />
      </Panel>
      <MiniMap pannable zoomable />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

function AppWrapper({ ywwidget }: AppProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <App ywwidget={ywwidget} />
    </ReactFlowProvider>
  );
}

/**
 * A YWWidget that visualizes YesWorkflow data in a ReactFlow graph.
 * @todo Need to have a clear mapping/definition of cell node and node id.
 */
export class YWWidget extends ReactWidget {
  readonly notebookID: string;
  readonly notebook: NotebookPanel; // cannot be null
  Nodes: CellNode[] = [];
  Edges: Edge[] = [];

  constructor(notebook: NotebookPanel) {
    super();
    this.addClass('jp-react-widget');
    this.notebook = notebook;
    this.notebookID = notebook.id;
    console.log('Constructing YWWidget with notebookID: ', this.notebookID);
    console.log('Constructing YWWidget with notebook: ', this.notebook);

    // initialize default nodes and prepare it to list for yw-core
    // and register to listen to code cell content changes
    let codeCellIndex = 0;
    this.notebook.content.widgets.forEach((cell, index) => {
      if (cell.model.type !== 'code') {
        return;
      } else {
        // register content changed listener
        cell.model.contentChanged.connect(() => {
          this.onCodeCellContentChanged(index);
        }, this);

        // prepare code cell for yw-core
        let cellMeta = cell.model.toJSON();
        const nodeID = `${codeCellIndex}`;
        const onContentChange = (env: ChangeEvent<HTMLTextAreaElement>) => {
          this.onNodeContentChanged(nodeID, env.target.value);
        };
        this.Nodes.push({
          id: nodeID,
          type: 'cell',
          position: { x: 0, y: 0 },
          data: {
            order_index: index,
            exec_count: 0,
            header: `Cell ${index + 1}`,
            code_block: cellMeta.source,
            on_content_change: onContentChange,
            status: 'not-execute'
          }
        });
        codeCellIndex += 1;
      }
    });
    console.log('[YWWidget] end of constructor');
  }

  onCodeCellContentChanged(cellIndex: number) {
    const cells = this.notebook.content.widgets.filter(cell => {
      return cell.model.type === 'code';
    });
    let source = cells[cellIndex].model.toJSON().source;
    reactflowController.updateCellNodeContent?.(`${cellIndex}`, source);
  }

  onNodeContentChanged(nodeID: string, new_code_block: string | string[]) {
    const node = this.Nodes.find(n => n.id === nodeID);
    if (node) {
      node.data.code_block = new_code_block;
      const cellModel = this.notebook.model?.cells.get(node.data.order_index);
      if (typeof node.data.code_block === 'string') {
        cellModel?.sharedModel.setSource(node.data.code_block);
      } else {
        cellModel?.sharedModel.setSource(node.data.code_block.join('\n'));
      }
    }
  }

  focusCell(cellIndex: number) {
    this.notebook.content.activeCellIndex = cellIndex;
    NotebookActions.focusActiveCell(this.notebook.content);
    console.log('[YWWidget] focusCell: ', cellIndex);
  }

  focusYWNode(cellIndex: number | undefined) {
    console.log('[YWWidget] focusYWNode: ', cellIndex);
    // find the node with the given ID
    const node = this.Nodes.find(n => n.data.order_index === cellIndex);
    if (node) {
      console.log('[YWWidget] Found node: ', node);
      reactflowController.focusAndSelectNode?.(node.id);
    }
  }

  render(): JSX.Element {
    console.log('[YWWidget] render()');
    return <AppWrapper ywwidget={this} />;
  }
}
