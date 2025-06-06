import React, { memo } from 'react';

import { BaseNode } from './components/base-node';
import {
  NodeHeader,
  NodeHeaderTitle,
  NodeHeaderActions,
  NodeHeaderDiveInAction,
  NodeHeaderRunAction,
  NodeHeaderDeleteAction
} from './components/node-header';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { Node, NodeProps } from '@xyflow/react';

export interface CellNodeData extends Record<string, unknown> {
  exec_count: number;
  header: string;
  code_block: string;
  status: 'not-execute' | 'executing' | 'executed';
}

export type CellNode = Node<CellNodeData>;

export const CellNodeWidget = memo(
  ({ data, selected }: NodeProps<CellNode>) => {
    return (
      <BaseNode selected={selected} className="px-3 py-2">
        <NodeHeader className="-mx-3 -mt-2 border-b">
          <NodeHeaderTitle>{data.header}</NodeHeaderTitle>
          <NodeHeaderActions>
            <NodeHeaderDiveInAction />
            <NodeHeaderRunAction />
            <NodeHeaderDeleteAction />
          </NodeHeaderActions>
        </NodeHeader>
        <div className="mt-2">
          <CodeEditor
            value={data.code_block}
            language="python"
            data-color-mode="light"
            style={{
              backgroundColor: '#f5f5f5',
              fontFamily:
                'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace'
            }}
          />
        </div>
      </BaseNode>
    );
  }
);
