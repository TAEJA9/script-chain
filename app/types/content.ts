export type NodeGroup = 'agent' | 'keyword' | 'mood' | 'pattern' | 'index' | 'content';

export interface GraphNode {
  id: string;
  name: string;
  group: NodeGroup;
  val?: number;
  description?: string;
  posterUrl?: string;
  category?: string;
  copyText?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Universe {
  id: string;
  title: string;
  tag: string;
  graph: GraphData;
}

export interface ExpandedNode {
  id: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

// 그라데이션 시작/끝 색상 쌍
export const NODE_COLORS: Record<NodeGroup, string> = {
  agent:   '#34d399', // 에메랄드
  keyword: '#fb923c', // 오렌지
  mood:    '#f472b6', // 핑크
  pattern: '#facc15', // 옐로우
  index:   '#a78bfa', // 바이올렛
  content: '#60a5fa', // 블루
};

export const NODE_COLORS_DARK: Record<NodeGroup, string> = {
  agent:   '#059669',
  keyword: '#ea580c',
  mood:    '#db2777',
  pattern: '#ca8a04',
  index:   '#7c3aed',
  content: '#2563eb',
};

export const NODE_SIZES: Record<NodeGroup, number> = {
  agent:   10,
  keyword:  8,
  mood:     9,
  pattern:  8,
  index:   10,
  content: 14,
};
