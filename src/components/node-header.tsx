import React, {
  forwardRef,
  HTMLAttributes,
  ReactNode,
  useCallback
} from 'react';
import { useNodeId, useNodes, useReactFlow } from '@xyflow/react';
import {
  EllipsisVertical,
  FastForward,
  FileDown,
  Play,
  SquareArrowDown,
  Trash
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { Button, ButtonProps } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { NotebookActions } from '@jupyterlab/notebook';
import { getNotebookAndCellById } from '../helper';

/* NODE HEADER -------------------------------------------------------------- */

export type NodeHeaderProps = HTMLAttributes<HTMLElement>;

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const NodeHeader = forwardRef<HTMLElement, NodeHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <header
        ref={ref}
        {...props}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2',
          // Remove or modify these classes if you modify the padding in the
          // `<BaseNode />` component.
          className
        )}
      />
    );
  }
);

NodeHeader.displayName = 'NodeHeader';

/* NODE HEADER TITLE -------------------------------------------------------- */

export type NodeHeaderTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  asChild?: boolean;
};

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const NodeHeaderTitle = forwardRef<
  HTMLHeadingElement,
  NodeHeaderTitleProps
>(({ className, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : 'h3';

  return (
    <Comp
      ref={ref}
      {...props}
      className={cn(className, 'user-select-none flex-1 font-semibold')}
    />
  );
});

NodeHeaderTitle.displayName = 'NodeHeaderTitle';

/* NODE HEADER ICON --------------------------------------------------------- */

export type NodeHeaderIconProps = HTMLAttributes<HTMLSpanElement>;

export const NodeHeaderIcon = forwardRef<HTMLSpanElement, NodeHeaderIconProps>(
  ({ className, ...props }, ref) => {
    return (
      <span ref={ref} {...props} className={cn(className, '[&>*]:size-5')} />
    );
  }
);

NodeHeaderIcon.displayName = 'NodeHeaderIcon';

/* NODE HEADER ACTIONS ------------------------------------------------------ */

export type NodeHeaderActionsProps = HTMLAttributes<HTMLDivElement>;

/**
 * A container for right-aligned action buttons in the node header.
 */
export const NodeHeaderActions = forwardRef<
  HTMLDivElement,
  NodeHeaderActionsProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        'ml-auto flex items-center gap-1 justify-self-end',
        className
      )}
    />
  );
});

NodeHeaderActions.displayName = 'NodeHeaderActions';

/* NODE HEADER ACTION ------------------------------------------------------- */

export type NodeHeaderActionProps = ButtonProps & {
  label: string;
};

/**
 * A thin wrapper around the `<Button />` component with a fixed sized suitable
 * for icons.
 *
 * Because the `<NodeHeaderAction />` component is intended to render icons, it's
 * important to provide a meaningful and accessible `label` prop that describes
 * the action.
 */
export const NodeHeaderAction = forwardRef<
  HTMLButtonElement,
  NodeHeaderActionProps
>(({ className, label, title, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      aria-label={label}
      title={title ?? label}
      className={cn(className, 'nodrag size-6 p-1')}
      {...props}
    />
  );
});

NodeHeaderAction.displayName = 'NodeHeaderAction';

//

export type NodeHeaderMenuActionProps = Omit<
  NodeHeaderActionProps,
  'onClick'
> & {
  trigger?: ReactNode;
};

/**
 * Renders a header action that opens a dropdown menu when clicked. The dropdown
 * trigger is a button with an ellipsis icon. The trigger's content can be changed
 * by using the `trigger` prop.
 *
 * Any children passed to the `<NodeHeaderMenuAction />` component will be rendered
 * inside the dropdown menu. You can read the docs for the shadcn dropdown menu
 * here: https://ui.shadcn.com/docs/components/dropdown-menu
 *
 */
export const NodeHeaderMenuAction = forwardRef<
  HTMLButtonElement,
  NodeHeaderMenuActionProps
>(({ trigger, children, ...props }, ref) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NodeHeaderAction ref={ref} {...props}>
          {trigger ?? <EllipsisVertical />}
        </NodeHeaderAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
});

NodeHeaderMenuAction.displayName = 'NodeHeaderMenuAction';

/* NODE HEADER DELETE ACTION --------------------------------------- */

export const NodeHeaderDeleteAction = () => {
  const id = useNodeId();
  const { setNodes } = useReactFlow();

  const handleClick = useCallback(() => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== id));
  }, [id, setNodes]);

  return (
    <NodeHeaderAction onClick={handleClick} variant="ghost" label="Delete node">
      <Trash />
    </NodeHeaderAction>
  );
};

NodeHeaderDeleteAction.displayName = 'NodeHeaderDeleteAction';

/* NODE HEADER DIVE IN ACTION -------------------------------------- */

export const NodeHeaderDiveInAction = () => {
  const id = useNodeId();

  const handleClick = () => {
    console.log('Dive in to node', id);
  };

  return (
    <NodeHeaderAction onClick={handleClick} label="Dive in to node">
      <SquareArrowDown />
    </NodeHeaderAction>
  );
};

/* NODE HEADER RUN ACTION -------------------------------------- */

export const NodeHeaderRunAction = () => {
  // Get the node info
  const nodeID = useNodeId();
  const nodes = useNodes();
  const currentNode = nodes.find(node => node.id === nodeID);

  // Get the notebook and cell through notebook_id and cell_id
  const { notebook, cell } = getNotebookAndCellById(
    currentNode?.data.notebook_id as string,
    currentNode?.data.cell_id as string
  );

  console.log('[Node Run] node', currentNode);
  console.log('[Node Run] notebook', notebook);
  console.log('[Node Run] cell', cell);

  const handleClick = async () => {
    if (currentNode && notebook && cell) {
      await NotebookActions.runCells(notebook, [cell]);
    }
  };

  return (
    <NodeHeaderAction onClick={handleClick} label="Run node">
      <Play />
    </NodeHeaderAction>
  );
};

/* NODE HEADER RUN ALL ACTION -------------------------------------- */

export const NodeHeaderRunAllDownstreamAction = () => {
  const node = useNodes();

  const handleClick = () => {
    console.log('Run all downstream node', node);
  };

  return (
    <NodeHeaderAction onClick={handleClick} label="Run all downstream action">
      <FastForward />
    </NodeHeaderAction>
  );
};

/* NODE HEADER RUN ALL ACTION -------------------------------------- */

export const NodeHeaderExportAction = () => {
  const node = useNodes();

  const handleClick = () => {
    console.log('Run export', node);
  };

  return (
    <NodeHeaderAction
      onClick={handleClick}
      label="Run export reproducible script action"
    >
      <FileDown />
    </NodeHeaderAction>
  );
};
