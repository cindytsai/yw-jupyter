import React from 'react';
import { AlignVerticalJustifyStart, Bug } from 'lucide-react';
import { Button } from './components/ui/button';

export interface ToolBarProps {
  onClickLayout?: () => void;
  onClickDebug?: () => void;
}

export function ToolBar({ onClickLayout, onClickDebug }: ToolBarProps): JSX.Element {
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
    </div>
  );
}
