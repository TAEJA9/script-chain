'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraphNode, GraphLink, GraphData, NODE_COLORS, NODE_COLORS_BG } from '../types/content';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as any;

interface TooltipState { x: number; y: number; node: GraphNode; }

export interface GraphControls {
  fitAll: () => void;
  reheat: () => void;
}

interface SemanticGraphProps {
  graphData: GraphData;
  onNodeClick: (node: GraphNode) => void;
  showLabels?: boolean;
  showTooltip?: boolean;
  controlRef?: React.MutableRefObject<GraphControls | null>;
}

interface ForceGraphRef {
  centerAt: (x: number, y: number, ms: number) => void;
  zoom: (k: number, ms: number) => void;
  zoomToFit: (ms?: number, px?: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d3Force: (name: string, force?: any) => any;
  d3ReheatSimulation: () => void;
}

const GROUP_KO: Record<string, string> = {
  agent: '인물', keyword: '키워드', mood: '감성/무드',
  pattern: '소재/배경', index: '역사적 배경', content: '콘텐츠',
};

const GROUP_ICON: Record<string, string> = {
  agent: '👤', keyword: '🏷', mood: '♥', pattern: '★', index: '🏛', content: '📖',
};

const GROUP_RADIUS: Record<string, number> = {
  content: 42, index: 30, agent: 30, mood: 27, keyword: 25, pattern: 25,
};

export default function SemanticGraph({
  graphData, onNodeClick,
  showLabels = true, showTooltip = true, controlRef,
}: SemanticGraphProps) {
  const graphRef = useRef<ForceGraphRef>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!graphRef.current) return;
      const charge = graphRef.current.d3Force('charge');
      if (charge) charge.strength(-1400);
      const link = graphRef.current.d3Force('link');
      if (link) link.distance(190).strength(0.3);
      const collision = graphRef.current.d3Force('collision');
      if (collision) collision.radius(55);
      graphRef.current.d3ReheatSimulation();

      if (controlRef) {
        controlRef.current = {
          fitAll: () => graphRef.current?.zoomToFit(400, 60),
          reheat: () => {
            graphRef.current?.d3ReheatSimulation();
            graphRef.current?.centerAt(0, 0, 400);
          },
        };
      }
    }, 200);
    return () => clearTimeout(t);
  }, [graphData, controlRef]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (graphRef.current && node.x !== undefined && node.y !== undefined) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(2, 500);
    }
    setTooltip(null);
    onNodeClick(node);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: GraphNode | null, _p: GraphNode | null, event?: MouseEvent) => {
    if (!showTooltip) { setTooltip(null); return; }
    if (node && event) setTooltip({ x: event.clientX, y: event.clientY, node });
    else setTooltip(null);
  }, [showTooltip]);

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const color = NODE_COLORS[node.group] ?? '#10b981';
    const bgColor = NODE_COLORS_BG[node.group] ?? '#f0fdf4';
    const isContent = node.group === 'content';
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const r = GROUP_RADIUS[node.group] ?? 28;

    // Shadow
    ctx.save();
    ctx.shadowColor = `${color}50`;
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isContent ? color : bgColor;
    ctx.fill();
    ctx.restore();

    // Border (only non-content)
    if (!isContent) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const textColor = isContent ? '#ffffff' : color;
    const catColor = isContent ? 'rgba(255,255,255,0.8)' : '#9ca3af';

    // Icon
    const iconFontSize = Math.max(8, r * 0.4);
    ctx.font = `${iconFontSize}px serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(GROUP_ICON[node.group] ?? '◉', x, y - r * 0.28);

    // Name (wrap if long)
    const name = node.name;
    const nameFontSize = Math.max(5, Math.min(r * 0.25, 11));
    ctx.font = `bold ${nameFontSize}px 'Pretendard', 'Apple SD Gothic Neo', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (name.length > 6) {
      const half = Math.ceil(name.length / 2);
      const lh = nameFontSize * 1.3;
      ctx.fillText(name.slice(0, half), x, y + r * 0.05 - lh / 2);
      ctx.fillText(name.slice(half), x, y + r * 0.05 + lh / 2);
    } else {
      ctx.fillText(name, x, y + r * 0.1);
    }

    // Category label
    const catFontSize = Math.max(4, nameFontSize * 0.78);
    ctx.font = `${catFontSize}px 'Pretendard', sans-serif`;
    ctx.fillStyle = catColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.category ?? GROUP_KO[node.group] ?? '', x, y + r * 0.44);
  }, []);

  const linkCanvasObject = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = typeof link.source === 'object' ? (link.source as GraphNode) : null;
    const t = typeof link.target === 'object' ? (link.target as GraphNode) : null;
    if (!s || !t) return;

    const sx = s.x ?? 0, sy = s.y ?? 0, tx = t.x ?? 0, ty = t.y ?? 0;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (showLabels && link.label) {
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const fs = Math.min(8, 10 / globalScale);
      ctx.save();
      ctx.font = `${fs}px 'Pretendard', sans-serif`;
      const tw = ctx.measureText(link.label).width;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(mx - tw / 2 - 3, my - fs / 2 - 2, tw + 6, fs + 4);
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.label, mx, my);
      ctx.restore();
    }
  }, [showLabels]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#f8fafc"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        nodeRelSize={1}
        nodeVal={(node: GraphNode) => Math.pow(GROUP_RADIUS[node.group] ?? 26, 2)}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => '#10b981'}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.5}
        cooldownTime={3000}
        warmupTicks={80}
        enableNodeDrag
        enableZoomInteraction
        minZoom={0.2}
        maxZoom={10}
      />

      {tooltip && showTooltip && (
        <div className="fixed z-50 pointer-events-none" style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}>
          <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-lg max-w-[200px]">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[tooltip.node.group] }} />
              <span className="text-xs text-gray-400">{GROUP_KO[tooltip.node.group]}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 leading-snug">{tooltip.node.name}</p>
            {tooltip.node.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{tooltip.node.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
