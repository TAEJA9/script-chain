'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraphNode, GraphLink, GraphData, NODE_COLORS, NODE_COLORS_DARK } from '../types/content';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as any;

interface TooltipState { x: number; y: number; node: GraphNode; }
interface SemanticGraphProps { graphData: GraphData; onNodeClick: (node: GraphNode) => void; }
interface ForceGraphRef {
  centerAt: (x: number, y: number, ms: number) => void;
  zoom: (k: number, ms: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d3Force: (name: string, force?: any) => any;
  d3ReheatSimulation: () => void;
}

const GROUP_KO: Record<string, string> = {
  agent: '인물', keyword: '키워드', mood: '감성/무드',
  pattern: '소비 패턴', index: '역사적 배경', content: '콘텐츠',
};

// 그룹별 고정 반지름 — content가 가장 크고 keyword/pattern이 가장 작음
const GROUP_RADIUS: Record<string, number> = {
  content: 32,
  index:   22,
  agent:   20,
  mood:    18,
  keyword: 16,
  pattern: 16,
};

export default function SemanticGraph({ graphData, onNodeClick }: SemanticGraphProps) {
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
      if (charge) charge.strength(-1200);
      const link = graphRef.current.d3Force('link');
      if (link) link.distance(200).strength(0.3);
      const collision = graphRef.current.d3Force('collision');
      if (collision) collision.radius(50);
      graphRef.current.d3ReheatSimulation();
    }, 150);
    return () => clearTimeout(t);
  }, [graphData]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (graphRef.current && node.x !== undefined && node.y !== undefined) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(1.8, 500);
    }
    setTooltip(null);
    onNodeClick(node);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: GraphNode | null, _p: GraphNode | null, event?: MouseEvent) => {
    if (node && event) setTooltip({ x: event.clientX, y: event.clientY, node });
    else setTooltip(null);
  }, []);

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const colorLight = NODE_COLORS[node.group] ?? '#60a5fa';
    const colorDark  = NODE_COLORS_DARK[node.group] ?? '#2563eb';
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const r = GROUP_RADIUS[node.group] ?? 16;

    // 외곽 글로우
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
    glow.addColorStop(0, `${colorLight}28`);
    glow.addColorStop(1, `${colorLight}00`);
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    // 그라데이션 원
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r);
    grad.addColorStop(0, colorLight);
    grad.addColorStop(1, colorDark);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // 상단 하이라이트
    const shine = ctx.createLinearGradient(x, y - r, x, y + r * 0.2);
    shine.addColorStop(0, 'rgba(255,255,255,0.28)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = shine;
    ctx.fill();

    // 테두리
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 텍스트 — 원 안에 맞도록 폰트 크기 조절
    const name = node.name;
    const availW = r * 1.6; // 지름의 80%를 텍스트 폭으로 사용

    // 한 줄 vs 두 줄 분기
    const lines: string[] = name.length <= 5
      ? [name]
      : [name.slice(0, Math.ceil(name.length / 2)), name.slice(Math.ceil(name.length / 2))];

    // 가장 긴 줄이 원 안에 맞는 폰트 크기 계산 (월드 좌표 고정, globalScale 보정)
    const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b);
    // 한글 1자 ≈ fontSize px 폭이므로 fontSize ≈ availW / charCount
    const maxFontSize = availW / longestLine.length;
    const fontSize = Math.max(1.5, Math.min(maxFontSize, r * 0.38));

    ctx.font = `bold ${fontSize}px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (lines.length === 1) {
      ctx.fillText(lines[0], x, y);
    } else {
      const lineH = fontSize * 1.25;
      ctx.fillText(lines[0], x, y - lineH / 2);
      ctx.fillText(lines[1], x, y + lineH / 2);
    }
  }, []);

  const linkCanvasObject = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = typeof link.source === 'object' ? (link.source as GraphNode) : null;
    const t = typeof link.target === 'object' ? (link.target as GraphNode) : null;
    if (!s || !t) return;

    const sx = s.x ?? 0, sy = s.y ?? 0, tx = t.x ?? 0, ty = t.y ?? 0;

    // 링크 선
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 링크 라벨 (확대 시에만)
    if (link.label && globalScale >= 1.4) {
      const mx = (sx + tx) / 2, my = (sy + ty) / 2;
      const fs = Math.min(3.5, 9 / globalScale);
      ctx.save();
      ctx.font = `${fs}px sans-serif`;
      const tw = ctx.measureText(link.label).width;
      ctx.fillStyle = 'rgba(15,23,42,0.75)';
      ctx.fillRect(mx - tw / 2 - 2, my - fs / 2 - 1, tw + 4, fs + 2);
      ctx.fillStyle = 'rgba(186,200,230,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.label, mx, my);
      ctx.restore();
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#020817"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        nodeRelSize={1}
        nodeVal={(node: GraphNode) => Math.pow(GROUP_RADIUS[node.group] ?? 16, 2)}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => 'rgba(148,163,184,0.6)'}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.5}
        cooldownTime={3000}
        warmupTicks={80}
        enableNodeDrag
        enableZoomInteraction
        minZoom={0.2}
        maxZoom={10}
      />

      {/* 호버 툴팁 */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none" style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}>
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/60 rounded-xl px-3 py-2 shadow-2xl max-w-[200px]">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[tooltip.node.group] }} />
              <span className="text-xs text-slate-400">{GROUP_KO[tooltip.node.group]}</span>
            </div>
            <p className="text-sm font-bold text-white leading-snug">{tooltip.node.name}</p>
            {tooltip.node.description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{tooltip.node.description}</p>
            )}
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3">
        <p className="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">노드 유형</p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(GROUP_KO).map(([group, label]) => (
            <div key={group} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${NODE_COLORS[group as keyof typeof NODE_COLORS]}, ${NODE_COLORS_DARK[group as keyof typeof NODE_COLORS_DARK]})` }} />
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
