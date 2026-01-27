import React from 'react';
import { AlignVerticalJustifyStart, Bug } from 'lucide-react';
import { Button } from './components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup
} from './components/ui/native-select';

export interface ToolBarProps {
  onClickLayout?: () => void;
  onClickDebug?: () => void;
}

export function ToolBar({
  onClickLayout,
  onClickDebug
}: ToolBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      <div>
        <Button variant="outline" size="sm" onClick={onClickLayout}>
          <AlignVerticalJustifyStart />
          Layout
        </Button>
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={onClickDebug}>
          <Bug />
          Debug
        </Button>
      </div>
      <div>
        <NativeSelect>
          <NativeSelectOptGroup label="Static Analysis">
            <NativeSelectOption value="Lower">
              Lower (Default)
            </NativeSelectOption>
            <NativeSelectOption value="Upper">Upper</NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>
      </div>
    </div>
  );
}
