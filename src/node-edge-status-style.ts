import { MarkerType } from '@xyflow/react';

export const CELL_NODE_STATUS_COLOR: Record<string, string> = {
  executed: '#0052B0',
  running: '#00D4FF',
  idle: '#C2C2C2',
  editing: '#F6A82D',
  failed: '#D43333'
};

export type EdgeStyle = {
  animated: boolean;
  markerEnd: {
    type: MarkerType;
    width: number;
    height: number;
    color: string;
  };
  style: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    strokeDasharray?: string;
  };
};

export const EDGE_STYLE: Record<string, EdgeStyle> = {
  guess_dep: {
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: '#C2C2C2'
    },
    style: {
      stroke: '#C2C2C2',
      strokeWidth: 1,
      opacity: 1,
      strokeDasharray: '5 5'
    }
  },
  selected_guess_dep: {
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: '#C2C2C2'
    },
    style: {
      stroke: '#C2C2C2',
      strokeWidth: 1,
      opacity: 0.8,
      strokeDasharray: '5 5'
    }
  },
  dep: {
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: '#000000'
    },
    style: {
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 0.8
    }
  },
  selected_dep: {
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: '#0052B0'
    },
    style: {
      stroke: '#0052B0',
      strokeWidth: 2,
      opacity: 1.0
    }
  }
};
