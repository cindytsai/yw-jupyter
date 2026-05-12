import React, { ChangeEvent } from 'react';
import { AlignVerticalJustifyStart, Bug, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup
} from './components/ui/native-select';

export interface IToolBarProps {
  onLayoutSelectionChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  onClickLayout?: () => void;
  onClickStaticAnalysis?: () => void;
  kernelName?: string;
}

export interface IDebugToolBarProps {
  onClickDebug?: () => void;
}

export function ToolBar({
  onLayoutSelectionChange,
  onClickLayout,
  onClickStaticAnalysis,
  kernelName
}: IToolBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      {/*Button*/}
      <div>
        <Button variant="outline" size="sm" onClick={onClickStaticAnalysis}>
          <Sparkles />
          Static Analysis
        </Button>
      </div>
      {/* Static Analysis option */}
      <NativeSelect defaultValue="Lower" onChange={onLayoutSelectionChange}>
        <NativeSelectOptGroup label="Static Analysis">
          <NativeSelectOption value="Lower">Lower</NativeSelectOption>
          <NativeSelectOption value="Upper">Upper</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>

      {/* Dynamic Analysis */}
      <span className="text-sm font-medium">Dynamic Analysis</span>
      <input
        type="text"
        value={kernelName}
        readOnly
        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white cursor-default"
        style={{
          border: 'var(--input-border, 1px solid #d1d5db)',
          borderRadius: 'var(--input-radius, 4px)',
          padding: 'var(--input-padding, 4px 8px)',
          fontSize: 'var(--input-font-size, 14px)',
          height: 'var(--input-height, 32px)',
          backgroundColor: 'var(--input-bg, white)',
          width: '90px'
        }}
      />

      {/*Button*/}
      <div>
        <Button variant="outline" size="sm" onClick={onClickLayout}>
          <AlignVerticalJustifyStart />
          Layout
        </Button>
      </div>
    </div>
  );
}

export function DebugToolBar({
  onClickDebug
}: IDebugToolBarProps): JSX.Element {
  return (
    <div>
      <Button variant="outline" size="sm" onClick={onClickDebug}>
        <Bug />
        Debug
      </Button>
    </div>
  );
}
