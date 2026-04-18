import React, { ChangeEvent, memo } from 'react';

import { BaseNode } from './components/base-node';
import { NodeSidePanel } from './components/node-side-panel';
import {
  NodeHeader,
  NodeHeaderTitle,
  NodeHeaderActions,
  // NodeHeaderDiveInAction,
  NodeHeaderRunAction,
  NodeHeaderRunAllDownstreamAction,
  NodeHeaderExportAction
  // NodeHeaderDeleteAction
} from './components/node-header';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { Handle, Node, NodeProps, Position } from '@xyflow/react';

export interface ICellNodeData extends Record<string, unknown> {
  order_index: number;
  exec_count: number;
  header: string;
  code_block: string | string[];
  on_content_change?: (env: ChangeEvent<HTMLTextAreaElement>) => void;
  status: 'not-execute' | 'executing' | 'executed' | 'editing';
}

const CELL_NODE_STATUS_COLOR: Record<string, string> = {
  executed: '#0052B0',
  'not-execute': '#C2C2C2',
  editing: '#EC7500'
};

export type CellNode = Node<ICellNodeData>;

export const CellNodeWidget = memo(
  ({ data, selected }: NodeProps<CellNode>) => {
    return (
      <>
        <BaseNode selected={selected} className="px-3 py-2">
          <NodeSidePanel color={CELL_NODE_STATUS_COLOR[data.status]} />
          <NodeHeader className="-mx-3 -mt-2 border-b">
            <NodeHeaderTitle>{data.header}</NodeHeaderTitle>
            <NodeHeaderActions>
              {/*<NodeHeaderDiveInAction />*/}
              <NodeHeaderRunAction />
              <NodeHeaderRunAllDownstreamAction />
              <NodeHeaderExportAction />
              {/*  <NodeHeaderDeleteAction />*/}
            </NodeHeaderActions>
          </NodeHeader>
          <div className="mt-2">
            <CodeEditor
              value={data.code_block}
              language="python"
              data-color-mode="light"
              onChange={data.on_content_change}
              style={{
                backgroundColor: '#f5f5f5',
                fontFamily:
                  'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace'
              }}
            />
          </div>
          <Handle type="target" position={Position.Top} />
          <Handle type="source" position={Position.Bottom} />
        </BaseNode>
      </>
    );
  }
);
