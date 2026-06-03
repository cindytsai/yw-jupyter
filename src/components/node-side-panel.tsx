import React, { forwardRef, HTMLAttributes } from 'react';

export type NodeSidePanelProps = HTMLAttributes<HTMLDivElement>;

/**
 * A narrow vertical color bar rendered on the left edge of a node, similar
 * to the cell-type indicator bar in Jupyter Notebook.
 */

export const NodeSidePanel = forwardRef<HTMLDivElement, NodeSidePanelProps>(
  ({ className, color, ...props }, ref) => {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0, // stretches full height of parent
          width: '5px',
          background: color
        }}
      />
    );
  }
);

NodeSidePanel.displayName = 'NodeSidePanel';
