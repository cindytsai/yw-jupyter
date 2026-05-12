import { ReactWidget } from '@jupyterlab/ui-components';
import { Notification } from '@jupyterlab/apputils';

import { CellNode, CellNodeWidget } from './cell-node-widget';

import React, { ChangeEvent, useCallback, useEffect, useRef } from 'react';
import {
  // DebugToolBar,
  ToolBar
} from './tool-bar';
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
import { ICellModel, ICodeCellModel } from '@jupyterlab/cells';
import { computeGuessedEdges, IYWEdge } from './yw-core';
import { EDGE_STYLE } from './node-edge-status-style';
import { computeDeps } from './dependency-catcher';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { getUpstreamNodeIdsAndEdgesIds } from './helper';

const nodeTypes = {
  cell: CellNodeWidget
};

interface IAppProps {
  ywwidget: YWWidget;
}

export type ReactFlowControllerType = {
  notebookCommands?: JupyterFrontEnd['commands'];
  focusAndSelectNode?: (nodeID: string) => void;
  updateCellNodeContent?: (cellID: string, content: string | string[]) => void;
  updateStatus?: (
    cellID: string,
    status: 'executed' | 'running' | 'idle' | 'stale' | 'failed'
  ) => void;
  updateExecutionCount?: (cellID: string, execCount: number) => void;
  updateEdges?: (cellID: string, execute_count: number) => void;
  addNode?(cellID: string, index: number, codeBlock: string | string[]): void;
  getNodes?(): CellNode[];
  getNotebookPanel?(): NotebookPanel;
  setGuessedEdges?(node: CellNode, edges: IYWEdge[]): void;
};

export const reactflowController: ReactFlowControllerType = {};

function App({ ywwidget }: IAppProps): JSX.Element {
  // ywwidget.Nodes are only for initialization
  // especially edges, it should be internal to the widget
  const [nodes, setNodes, onNodesChange] = useNodesState(ywwidget.Nodes);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { getNode, setCenter } = useReactFlow();
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

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
        const computedEdges = await computeGuessedEdges(
          ywwidget.notebook.sessionContext.session?.kernel,
          nodes
        );
        setEdges(
          computedEdges.map(edge => ({
            ...edge,
            type: 'default',
            data: {
              dep_type: edge.dep_type
            },
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
          const computedEdges = await computeGuessedEdges(
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

  // Static analysis button handler
  const onStaticAnalysis = useCallback(async () => {
    const currentNodes = nodesRef.current;

    // call static analysis
    // order the nodes in a list:
    //     executed -> based on order of the node book for idle
    const execNodes = currentNodes
      .filter(n => n.data.exec_count > 0)
      .sort((a, b) => a.data.exec_count - b.data.exec_count);
    const idleNodes = currentNodes
      .filter(n => n.data.exec_count === 0)
      .sort((a, b) => Number(a.id) - Number(b.id));
    const prepNodes = [...execNodes, ...idleNodes];
    const guessedEdges = await computeGuessedEdges(
      ywwidget.notebook.sessionContext.session?.kernel,
      prepNodes
    );

    // add the edges:
    // 1. remove all previously predicted edges
    // 2. add only the predicted edges where either the source or the target are not executed
    setEdges(prevEdges => {
      // preserve only definite edges
      const preserved = prevEdges.filter(
        e => !(e.data?.dep_type === 'predicted')
      );

      // add all the predicted edges where either source or target != executed
      const relevantGuessedEdges = guessedEdges.filter(edge => {
        const sourceNode = nodesRef.current.find(n => n.id === edge.source);
        const targetNode = nodesRef.current.find(n => n.id === edge.target);
        return (
          sourceNode?.data.status !== 'executed' ||
          targetNode?.data.status !== 'executed'
        );
      });

      return [
        ...preserved,
        ...relevantGuessedEdges.map(edge => ({
          ...edge,
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'default',
          data: { dep_type: 'predicted' },
          ...EDGE_STYLE['guess_dep']
        }))
      ];
    });
  }, [setEdges]);

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
      status: 'executed' | 'running' | 'idle' | 'stale' | 'failed'
    ) => {
      setNodes(nds =>
        nds.map(node =>
          node.data.cell_id === cellID
            ? {
                ...node,
                data: {
                  ...node.data,
                  prev_status: node.data.status,
                  status: status
                }
              }
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
        console.log('[updateEdges]', obj);
        const currentNodes = nodesRef.current;
        const nodeID = currentNodes.find(
          node => node.data.cell_id === cellID
        )?.id;
        setEdges(prevEdges => {
          // add and override every new definite edges
          const newEdges = obj.map(edge => ({
            ...edge,
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'default',
            data: {
              dep_type: edge.dep_type
            },
            ...EDGE_STYLE['dep']
          }));
          const newEdgeIds = new Set(newEdges.map(e => e.id));

          // preserve edges except:
          // 1. definite edges targeting current node
          // 2. edges whose ids already exist in newEdges
          const preserved = prevEdges.filter(
            e =>
              !(
                (e.target === nodeID && e.data?.dep_type === 'definite') ||
                newEdgeIds.has(e.id)
              )
          );

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
            status: 'idle',
            prev_status: 'idle'
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

  // // onDebugbutton
  // const onDebugButton = () => {
  //   console.log('[Debug] Nodes: ', nodes);
  //   console.log('[Debug] Edges: ', edges);
  // };

  // Select all the edges and upstream nodes when a node is selected
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: CellNode[]; edges: Edge[] }) => {
      if (selectedNodes.length === 0) {
        // deselected: reset all edges
        setEdges(prevEdges =>
          prevEdges.map(edge => ({
            ...edge,
            ...(edge.data?.dep_type === 'predicted'
              ? EDGE_STYLE['guess_dep']
              : EDGE_STYLE['dep'])
          }))
        );
        return;
      }

      console.log('[onSelectionChange]', selectedNodes);

      // Get all upstream node ids for selected nodes
      const upstreamIds: { nodes: Set<string>; edges: Set<string> } = {
        nodes: new Set<string>(),
        edges: new Set<string>()
      };
      selectedNodes.forEach(node => {
        const { nodes, edges } = getUpstreamNodeIdsAndEdgesIds(
          node.id,
          edgesRef.current
        );
        nodes.forEach(id => upstreamIds['nodes'].add(id));
        edges.forEach(id => upstreamIds['edges'].add(id));
      });

      console.log('[onSelectionChange]', upstreamIds['edges']);

      setEdges(prevEdges =>
        prevEdges.map(edge => {
          const isUpstream = upstreamIds['edges'].has(edge.id);
          if (isUpstream) {
            return {
              ...edge,
              ...(edge.data?.dep_type === 'predicted'
                ? EDGE_STYLE['selected_guess_dep']
                : EDGE_STYLE['selected_dep'])
            };
          }
          return {
            ...edge,
            ...(edge.data?.dep_type === 'predicted'
              ? EDGE_STYLE['guess_dep']
              : EDGE_STYLE['dep'])
          };
        })
      );
    },
    [setEdges]
  );

  // Get notebook
  reactflowController.getNotebookPanel = () => {
    return ywwidget.notebook;
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
      onSelectionChange={onSelectionChange}
    >
      <Panel position="top-left">
        <ToolBar
          onLayoutSelectionChange={onLayoutSelectionChange}
          onClickLayout={onLayoutButton}
          kernelName={
            ywwidget.notebook.sessionContext.session?.kernel?.name ||
            'No Kernel'
          }
          onClickStaticAnalysis={onStaticAnalysis}
        />
        {/*<DebugToolBar onClickDebug={onDebugButton} />*/}
      </Panel>
      <MiniMap pannable zoomable position="bottom-right" />
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
 */
export class YWWidget extends ReactWidget {
  readonly notebookID: string;
  readonly notebook: NotebookPanel; // cannot be null
  readonly commands: JupyterFrontEnd['commands'];
  Nodes: CellNode[] = [];

  private async initIPyflow(): Promise<void> {
    const kernel = this.notebook.sessionContext.session?.kernel;
    if (!kernel) {
      return;
    }

    const initCode = `
%flow mode normal
%flow direction any_order
from ipyflow import cells
`;

    await kernel.requestExecute({
      code: initCode,
      silent: true,
      store_history: false
    }).done;

    console.log('[YWWidget] ipyflow initialized');
  }

  private onContentChanged = (model: ICellModel) => {
    console.log('[onContentChanged] CellID', model.id);
    const cellID = model.id;
    const cell = this.notebook.content.widgets.find(cell => {
      return cell.model.id === cellID;
    });
    console.log('[onContentChanged]', cell);
    if (cell) {
      const source = cell.model.toJSON().source;
      reactflowController.updateCellNodeContent?.(cellID, source);
    }
  };

  private onStateChanged = (model: ICellModel, value: IChangedArgs<any>) => {
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
        reactflowController.updateExecutionCount(model.id, value.newValue);
      }
    } else if (value.name === 'isDirty') {
      if (
        reactflowController?.updateStatus &&
        typeof value.oldValue === 'boolean' &&
        typeof value.newValue === 'boolean'
      ) {
        const node = reactflowController
          .getNodes?.()
          .find(n => n.data.cell_id === model.id);
        if (value.newValue === true && value.oldValue === false) {
          if (node?.data.status !== 'idle') {
            reactflowController.updateStatus(model.id, 'stale');
          }
        } else {
          const prevStatus = node?.data.prev_status;
          console.log('[isDirty]', node?.data.prev_status);
          const revertStatus =
            prevStatus === 'stale' || prevStatus === undefined
              ? 'idle'
              : prevStatus;
          reactflowController.updateStatus(model.id, revertStatus);
        }
      }
    }
  };

  private onExecuted = (_, args) => {
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
  };

  private onCellListChanged = (_, change) => {
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
  };

  private disconnectSignals() {
    // disconnect per-cell signals
    this.notebook.content.widgets.forEach(cell => {
      if (cell.model.type !== 'code') {
        return;
      }
      cell.model.contentChanged.disconnect(this.onContentChanged, this);
      cell.model.stateChanged.disconnect(this.onStateChanged, this);
    });

    // disconnect per-celllist signals
    this.notebook.content.model?.cells.changed.disconnect(
      this.onCellListChanged,
      this
    );

    // disconnect per-notebook signals
    NotebookActions.executed.disconnect(this.onExecuted, this);
  }

  constructor(notebook: NotebookPanel, app: JupyterFrontEnd) {
    super();
    this.addClass('jp-react-widget');
    this.notebook = notebook;
    this.notebookID = notebook.id;
    this.commands = app.commands;
    console.log('Constructing YWWidget with notebookID: ', this.notebookID);
    console.log('Constructing YWWidget with notebook: ', this.notebook);

    // register notebook commands
    reactflowController.notebookCommands = app.commands;

    // initialize IPyflow for dynamic analysis
    const kernel_name = this.notebook.sessionContext.session?.kernel?.name;
    if (kernel_name === 'ipyflow') {
      this.notebook.sessionContext.ready.then(() => {
        this.initIPyflow();
      });
    } else {
      Notification.error(
        `Currently only supports ipyflow kernel for dynamic dependency tracking. Current kernel: "${kernel_name}"`,
        {
          autoClose: 10000
        }
      );
    }

    // initialize default nodes and prepare it to list for yw-core
    // and register to listen to code cell content changes
    let codeCellIndex = 0;
    this.notebook.content.widgets.forEach((cell, index) => {
      if (cell.model.type !== 'code') {
        return;
      } else {
        // register content changed listener
        cell.model.contentChanged.connect(this.onContentChanged, this);

        // register execute status change listener
        cell.model.stateChanged.connect(this.onStateChanged, this);

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
            status: 'idle',
            prev_status: 'idle'
          }
        });
        codeCellIndex += 1;
      }
    });

    // Register to notebook actions to get the execution status when run the cell
    NotebookActions.executed.connect(this.onExecuted, this);

    // Jupyter creates a new cell when reordering the cell,
    // thus we need to bind the signals again
    // TODO: the node should follow this logic, otherwise we cannot tell what is added and what is reordered
    this.notebook.content.model?.cells.changed.connect(
      this.onCellListChanged,
      this
    );

    console.log('[YWWidget] end of constructor');
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

  dispose() {
    // disconnect signals
    this.disconnectSignals();

    super.dispose();
  }
}
