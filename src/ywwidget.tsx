import { ReactWidget } from '@jupyterlab/ui-components';

import { CellNode, CellNodeWidget } from './cell-node-widget';

import React, { ChangeEvent, useCallback, useEffect, useRef } from 'react';
import { DebugToolBar, ToolBar } from './tool-bar';
import { getLayoutedElements } from './layout';

import {
  Background,
  Controls,
  Edge,
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
import { ICellModel } from '@jupyterlab/cells';
import { ICodeCellModel } from '@jupyterlab/cells';
import { computeEdges } from './yw-core';
import { EDGE_STYLE } from './node-edge-status-style';
import { computeDeps } from './dependency-catcher';

const nodeTypes = {
  cell: CellNodeWidget
};

interface IAppProps {
  ywwidget: YWWidget;
}

export type ReactFlowControllerType = {
  focusAndSelectNode?: (nodeID: string) => void;
  updateCellNodeContent?: (cellID: string, content: string | string[]) => void;
  updateStatus?: (
    cellID: string,
    status: 'executed' | 'running' | 'idle' | 'editing' | 'failed'
  ) => void;
  updateExecutionCount?: (cellID: string, execCount: number) => void;
  updateEdges?: (cellID: string, execute_count: number) => void;
  addNode?(cellID: string, index: number, codeBlock: string | string[]): void;
  getNodes?(): CellNode[];
};

export const reactflowController: ReactFlowControllerType = {};

function App({ ywwidget }: IAppProps): JSX.Element {
  // ywwidget.Nodes are only for initialization
  // especially edges, it should be internal to the widget
  const [nodes, setNodes, onNodesChange] = useNodesState(ywwidget.Nodes);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { getNode, setCenter } = useReactFlow();
  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // On node double click handler
  const onNodeDoubleClick = (event: React.MouseEvent, node: CellNode) => {
    console.log('[App] Node double-clicked: ', node);
    if (typeof node.data.cell_id === 'string') {
      ywwidget.focusCell(node.data.cell_id);
    }
  };

  // Compute the edges on first launch
  useEffect(() => {
    console.log('[App] Compute edges on first launch');
    (async () => {
      try {
        const computedEdges = await computeEdges(
          ywwidget.notebook.sessionContext.session?.kernel,
          nodes
        );
        setEdges(
          computedEdges.map(edge => ({
            ...edge,
            type: 'default',
            ...EDGE_STYLE['guess_dep']
          }))
        );
        const obj = await getLayoutedElements(nodes, computedEdges);
        setNodes(obj['nodes']);
      } catch (err) {
        console.error('[App] Failed to compute edges or layout', err);
      }
    })();
  }, []);

  // Layout (edge compute) selection change handler
  const onLayoutSelectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    console.log('[ToolBar] Selected value: ', event.target.value);
    {
      (async () => {
        try {
          const computedEdges = await computeEdges(
            ywwidget.notebook.sessionContext.session?.kernel,
            nodes,
            event.target.value
          );
          const obj = await getLayoutedElements(nodes, computedEdges);
          setNodes(obj['nodes']);
        } catch (err) {
          console.error('[App] Failed to compute edges or layout', err);
        }
      })();
    }
  };

  // Layout button handler
  const onLayoutButton = useCallback(() => {
    getLayoutedElements(nodes, edges).then(obj => {
      setNodes(obj['nodes']);
      console.log('[onLayoutButton] Nodes:', obj['nodes']);
      console.log('[onLayoutButton] Edges:', edges);
    });
  }, [nodes, edges]);

  // Debug button handler
  // const onDebugButton = () => {
  //   console.log('[Debug] Nodes: ', nodes);
  //   console.log('[Debug] Edges: ', edges);
  // };

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
    (cellID: string, content: string | string[]) => {
      setNodes(nds =>
        nds.map(node => {
          if (node.data.cell_id === cellID) {
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

  // On Node status change
  const updateStatus = useCallback(
    (
      cellID: string,
      status: 'executed' | 'running' | 'idle' | 'editing' | 'failed'
    ) => {
      setNodes(nds =>
        nds.map(node =>
          node.data.cell_id === cellID
            ? { ...node, data: { ...node.data, status: status } }
            : node
        )
      );
    },
    [setNodes]
  );
  useEffect(() => {
    reactflowController.updateStatus = updateStatus;
    return () => {
      delete reactflowController.updateStatus;
    };
  }, []);

  // Update edges based on dependency from ipyflow
  const updateEdges = useCallback(
    (cellID: string, execute_count: number) => {
      computeDeps(
        ywwidget.notebook.sessionContext.session?.kernel,
        cellID,
        execute_count as number,
        nodesRef.current
      ).then(obj => {
        console.log('[updateEdges]', obj); // TODO: %flow mode normal should be code block to work.
        setEdges(prevEdges => {
          const newEdges = obj.map(edge => ({
            ...edge,
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'default',
            ...EDGE_STYLE['dep']
          }));
          const existingIds = new Set(newEdges.map(e => e.id));
          const preserved = prevEdges.filter(e => !existingIds.has(e.id));
          return [...preserved, ...newEdges];
        });
      });
    },
    [setEdges]
  );
  useEffect(() => {
    reactflowController.updateEdges = updateEdges;
    return () => {
      delete reactflowController.updateEdges;
    };
  }, []);

  // Get nodes
  useEffect(() => {
    reactflowController.getNodes = () => nodesRef.current;
    return () => {
      delete reactflowController.getNodes;
    };
  }, []);

  // Add node
  const addNode = useCallback(
    (cellID: string, index: number, codeBlock: string | string[]) => {
      const currentNodes = nodesRef.current;
      const maxId = Math.max(...currentNodes.map(node => Number(node.id)));
      setNodes(prevNodes => {
        const node: CellNode = {
          id: `${maxId + 1}`,
          type: 'cell',
          position: { x: 0, y: 0 },
          data: {
            order_index: index,
            notebook_id: ywwidget.notebookID,
            cell_id: cellID,
            exec_count: 0,
            header: `Cell ${maxId + 1}`,
            code_block: codeBlock,
            on_content_change: (env: ChangeEvent<HTMLTextAreaElement>) => {
              ywwidget.onNodeContentChanged(`${maxId + 1}`, env.target.value);
            },
            status: 'idle'
          }
        };
        return [...prevNodes, node];
      });
    },
    [setNodes]
  );
  useEffect(() => {
    reactflowController.addNode = addNode;
    return () => {
      delete reactflowController.addNode;
    };
  }, []);

  // On Node execution count change
  const updateExecutionCount = useCallback(
    (cellID: string, execCount: number) => {
      setNodes(nds =>
        nds.map(node =>
          node.data.cell_id === cellID
            ? { ...node, data: { ...node.data, exec_count: execCount } }
            : node
        )
      );
    },
    [setNodes]
  );
  useEffect(() => {
    reactflowController.updateExecutionCount = updateExecutionCount;
    return () => {
      delete reactflowController.updateExecutionCount;
    };
  }, []);

  // onDebugbutton
  const onDebugButton = () => {
    console.log('[Debug] Nodes: ', nodes);
    console.log('[Debug] Edges: ', edges);
  };

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
        <DebugToolBar onClickDebug={onDebugButton} />
      </Panel>
      <MiniMap pannable zoomable position="top-right" />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

function AppWrapper({ ywwidget }: IAppProps): JSX.Element {
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

  private onContentChanged = (model: ICellModel) => {
    console.log('[onContentChanged] CellID', model.id);
    this.onCodeCellContentChanged(model.id);
  };

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
        // register content changed listener (TODO: need disconnection to avoid memory leakage)
        cell.model.contentChanged.connect(this.onContentChanged, this);

        // register execute status change listener (TODO: need disconnection to avoid memory leakage)
        cell.model.stateChanged.connect((model, value) => {
          console.log('[Code Cell State Changed]', { model, value });
          // Update the execution state and count
          if (value.name === 'executionState') {
            if (
              reactflowController?.updateStatus &&
              typeof value.oldValue === 'string' &&
              typeof value.newValue === 'string'
            ) {
              if (value.oldValue === 'idle' && value.newValue === 'running') {
                reactflowController.updateStatus(model.id, 'running');
              }
            }
          } else if (value.name === 'executionCount') {
            if (
              reactflowController?.updateExecutionCount &&
              typeof value.newValue === 'number'
            ) {
              reactflowController.updateExecutionCount(
                model.id,
                value.newValue
              );
            }
          }
        });

        // prepare code cell for yw-core
        const cellMeta = cell.model.toJSON();
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
            notebook_id: notebook.id,
            cell_id: cell.model.id,
            exec_count: 0,
            header: `Cell ${index + 1}`,
            code_block: cellMeta.source,
            on_content_change: onContentChange,
            status: 'idle'
          }
        });
        codeCellIndex += 1;
      }
    });

    // Register to notebook actions to get the execution status when run the cell
    NotebookActions.executed.connect((_, args) => {
      const { cell, success } = args;
      if (reactflowController.updateStatus) {
        reactflowController.updateStatus(
          cell.model.id,
          success ? 'executed' : 'failed'
        );
      }

      const exec_count = (cell.model as ICodeCellModel).executionCount;
      console.log(
        '[NotebookActions.executed] cellID:',
        cell.model.id,
        'exec_count:',
        exec_count
      );

      if (reactflowController.updateEdges && exec_count) {
        reactflowController.updateEdges(cell.model.id, exec_count);
      }
    });

    // Jupyter creates a new cell when reordering the cell,
    // thus we need to bind the signals again
    // TODO: need to disconnect this
    // TODO: the node should follow this logic, otherwise we cannot tell what is added and what is reordered
    this.notebook.content.model?.cells.changed.connect((_, change) => {
      console.log('[CellChange] change type:', change.type);
      console.log('[CellChange] newIndex', change.newIndex);
      if (change.type === 'add') {
        const cell = this.notebook.content.widgets[change.newIndex];
        // if the cellID exist in the node list, then it is reordering
        if (
          reactflowController
            .getNodes?.()
            .find(n => n.data.cell_id === cell.model.id)
        ) {
          cell.model.contentChanged.connect(this.onContentChanged, this);
        } else {
          reactflowController.addNode?.(
            cell.model.id,
            change.newIndex,
            cell.model.toJSON().source
          );
          cell.model.contentChanged.connect(this.onContentChanged, this);
        }
      }
    });

    console.log('[YWWidget] end of constructor');
  }

  onCodeCellContentChanged(cellID: string) {
    const cell = this.notebook.content.widgets.find(cell => {
      return cell.model.id === cellID;
    });
    console.log('[onCodeCellContentChanged]', cell);
    if (cell) {
      const source = cell.model.toJSON().source;
      reactflowController.updateCellNodeContent?.(cellID, source);
    }
  }

  onNodeContentChanged(nodeID: string, new_code_block: string | string[]) {
    const node = reactflowController.getNodes?.().find(n => n.id === nodeID);
    if (node) {
      node.data.code_block = new_code_block;
      const cell = this.notebook.content.widgets.find(cell => {
        return cell.model.id === node.data.cell_id;
      });
      if (!cell) {
        return;
      }
      console.log('[onNodeContent Changed]', cell);
      const codeCell = cell.model.sharedModel;
      if (typeof node.data.code_block === 'string') {
        codeCell?.setSource(node.data.code_block);
      } else {
        codeCell?.setSource(node.data.code_block.join('\n'));
      }
    }
  }

  focusCell(cellID: string) {
    // Jupyter uses the _order_ of the cell index to focus on a cell in the notebook:
    //   1. Find the cell ID
    //   2. Use the ID to find the order of the cell
    this.notebook.content.activeCellIndex =
      this.notebook.content.widgets.findIndex(
        cell_node => cell_node.model.id === cellID
      );
    NotebookActions.focusActiveCell(this.notebook.content);
    console.log('[YWWidget] focusCellID: ', cellID);
  }

  focusYWNode(cellID: string) {
    console.log('[YWWidget] focusYWNode: ', cellID);
    // find the node with the given ID
    const node = reactflowController
      .getNodes?.()
      .find(n => n.data.cell_id === cellID);
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
