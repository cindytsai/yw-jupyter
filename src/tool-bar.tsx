import React, { ChangeEvent } from 'react';
import { AlignVerticalJustifyStart, Bug } from 'lucide-react';
import { Button } from './components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup
} from './components/ui/native-select';

export interface IToolBarProps {
  onLayoutSelectionChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  onClickLayout?: () => void;
}

export interface IDebugToolBarProps {
  onClickDebug?: () => void;
}

export function ToolBar({
  onLayoutSelectionChange,
  onClickLayout
}: IToolBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      <div>
        <NativeSelect defaultValue="Lower" onChange={onLayoutSelectionChange}>
          <NativeSelectOptGroup label="Static Analysis">
            <NativeSelectOption value="Lower">Lower</NativeSelectOption>
            <NativeSelectOption value="Upper">Upper</NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>
      </div>
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
