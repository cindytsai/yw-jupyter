import React from 'react';
import { AlignVerticalJustifyStart } from 'lucide-react';
import { Button } from './components/ui/button';

export interface ToolBarProps {
  onClick?: () => void;
}

export function ToolBar({ onClick }: ToolBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      <Button variant="outline" size="sm" onClick={onClick}>
        <AlignVerticalJustifyStart />
        Layout
      </Button>
    </div>
  );
}
