import { ReactWidget } from '@jupyterlab/ui-components';
import { Notification } from '@jupyterlab/apputils';

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
    status: 'executed' | 'running' | 'idle' | 'editing' | 'failed'
  ) => void;
  updateExecutionCount?: (cellID: string, execCount: number) => void;
  updateEdges?: (cellID: string, execute_count: number) => void;
  addNode?(cellID: string, index: number, codeBlock: string | string[]): void;
  getNodes?(): CellNode[];
  setGuessedEdges?(node: CellNode, edges: IYWEdge[]): void;
  getNotebookPanel?(): NotebookPanel;
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
        setEdges(prevEdges => {
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

  // Add node and call static analysis
  const addNode = useCallback(
    async (cellID: string, index: number, codeBlock: string | string[]) => {
      // add node
      const currentNodes = nodesRef.current;
      const maxId = Math.max(...currentNodes.map(node => Number(node.id)));
      const newId = maxId + 1;

      const newNode: CellNode = {
        id: `${newId}`,
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
      setNodes(prevNodes => {
        return [...prevNodes, newNode];
      });

      // call static analysis
      // order the nodes in a list:
      //     executed -> based on order of the node book for idle
      const execNodes = currentNodes
        .filter(n => n.data.exec_count > 0)
        .sort((a, b) => a.data.exec_count - b.data.exec_count);
      const idleNodes = currentNodes
        .filter(n => n.data.exec_count === 0)
        .sort((a, b) => Number(a.id) - Number(b.id));
      const prepNodes = [...execNodes, ...idleNodes, newNode];
      const guessedEdges = await computeGuessedEdges(
        ywwidget.notebook.sessionContext.session?.kernel,
        prepNodes
      );
      const currentNodeGuessedEdges = guessedEdges.filter(
        edge => edge.target === `${newId}`
      );

      // add the edges:
      // since the cell is not executed / idle,
      // we need to remove the old and add the new one
      setEdges(prevEdges => {
        // preserve other nodes' edges
        const preserved = prevEdges.filter(e => e.target !== `${newId}`);
        return [
          ...preserved,
          ...currentNodeGuessedEdges.map(edge => ({
            ...edge,
            type: 'default',
            data: { dep_type: edge.dep_type },
            ...EDGE_STYLE['guess_dep']
          }))
        ];
      });
    },
    [setNodes, setEdges]
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

  // setGuessedEdges
  const setGuessedEdges = useCallback(
    (node: CellNode, newEdges: IYWEdge[]) => {
      setEdges(prevEdges => {
        // remove all guessed edges for this node
        const preserved = prevEdges.filter(
          e => e.target !== node.id && e.source !== node.id
        );

        const currentNodeGuessedEdges = newEdges.filter(
          edge => edge.source === node.id || edge.target === node.id
        );

        return [
          ...preserved,
          ...currentNodeGuessedEdges.map(edge => ({
            ...edge,
            type: 'default',
            data: { dep_type: 'guessed' },
            ...EDGE_STYLE['guess_dep']
          }))
        ];
      });
    },
    [setEdges]
  );
  useEffect(() => {
    reactflowController.setGuessedEdges = setGuessedEdges;
    return () => {
      delete reactflowController.setGuessedEdges;
    };
  }, []);

  // onDebugbutton
  const onDebugButton = () => {
    console.log('[Debug] Nodes: ', nodes);
    console.log('[Debug] Edges: ', edges);
  };

  // Select all the edges and upstream nodes when a node is selected
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: CellNode[]; edges: Edge[] }) => {
      if (selectedNodes.length === 0) {
        // deselected: reset all edges
        setEdges(prevEdges =>
          prevEdges.map(edge => ({
            ...edge,
            ...(edge.data?.dep_type === 'guessed'
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
              ...(edge.data?.dep_type === 'guessed'
                ? EDGE_STYLE['selected_guess_dep']
                : EDGE_STYLE['selected_dep'])
            };
          }
          return {
            ...edge,
            ...(edge.data?.dep_type === 'guessed'
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
        />
        <DebugToolBar onClickDebug={onDebugButton} />
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

  private contentChangeTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  private clearContentChangeTimer(cellID: string) {
    const existingTimer = this.contentChangeTimers.get(cellID);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.contentChangeTimers.delete(cellID);
      console.log('[clearContentChangeTimer] cleared timer for:', cellID);
    }
  }

  private runningCells = new Set<string>();

  private onContentChanged = (model: ICellModel) => {
    // Get the cell
    const cellID = model.id;
    const cell = this.notebook.content.widgets.find(cell => {
      return cell.model.id === cellID;
    });
    console.log('[onContentChanged] cell:', cell);
    if (cell) {
      // sync the content
      const source = cell.model.toJSON().source;
      reactflowController.updateCellNodeContent?.(cellID, source);

      // only trigger static analysis for idle
      const node = reactflowController
        .getNodes?.()
        .find(n => n.data.cell_id === model.id);
      console.log('[onContentChanged] node: ', node);
      if (node?.data.status !== 'idle' || node?.data.prev_status !== 'idle') {
        console.log(
          '[onContentChanged] returned: ',
          node?.data.status,
          node?.data.prev_status
        );
        return;
      }

      // skip running cells
      if (this.runningCells.has(model.id)) {
        console.log('[onContentChanged] skipping - cell is running:', model.id);
        return;
      }

      console.log(
        '[onContentChanged] continue: ',
        node?.data.status,
        node?.data.prev_status
      );

      console.log(
        '[onContentChanged] existing timer:',
        this.contentChangeTimers.get(model.id)
      );

      // call static analysis to update edges when content changed
      const existingTimer = this.contentChangeTimers.get(model.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      console.log('[onContentChanged] timer', this.contentChangeTimers);

      const timer = setTimeout(() => {
        (async () => {
          console.log(
            '[onContentChanged] calling static analysis for:',
            model.id
          );

          // static analysis
          if (
            reactflowController.getNodes &&
            reactflowController.setGuessedEdges
          ) {
            const currentNodes = reactflowController.getNodes();
            const execNodes = currentNodes
              .filter(n => n.data.exec_count > 0)
              .sort((a, b) => a.data.exec_count - b.data.exec_count);
            const idleNodes = currentNodes
              .filter(n => n.data.exec_count === 0)
              .sort((a, b) => Number(a.id) - Number(b.id));
            const prepNodes = [...execNodes, ...idleNodes];
            const guessedEdges = await computeGuessedEdges(
              this.notebook.sessionContext.session?.kernel,
              prepNodes
            );
            console.log('[onContentChanged] node', node);
            console.log('[onContentChanged] static analysis', guessedEdges);
            reactflowController.setGuessedEdges(node, guessedEdges);
          }
          this.contentChangeTimers.delete(model.id);
        })();
      }, 1000);

      this.contentChangeTimers.set(model.id, timer);
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
          this.clearContentChangeTimer(model.id);
          this.runningCells.add(model.id);
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
            reactflowController.updateStatus(model.id, 'editing');
          }
        } else {
          const prevStatus = node?.data.prev_status;
          console.log('[isDirty]', node?.data.prev_status);
          const revertStatus =
            prevStatus === 'editing' || prevStatus === undefined
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

    this.runningCells.delete(cell.model.id);

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
