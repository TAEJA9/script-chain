'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode, Universe } from './types/content';
import TrendingTags from './components/TrendingTags';
import DetailSidebar from './components/DetailSidebar';
import mockData from './data/mockUniverses.json';

const SemanticGraph = dynamic(() => import('./components/SemanticGraph'), { ssr: false });

const universes: Universe[] = mockData.universes as Universe[];

function fuzzySearch(query: string): Universe | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  for (const universe of universes) {
    if (
      universe.title.toLowerCase().replace(/\s+/g, '').includes(q) ||
      universe.tag.toLowerCase().replace(/\s+/g, '').includes(q)
    ) {
      return universe;
    }
    const hasNode = universe.graph.nodes.some(
      (node) =>
        node.name.toLowerCase().replace(/\s+/g, '').includes(q) ||
        (node.description ?? '').toLowerCase().replace(/\s+/g, '').includes(q)
    );
    if (hasNode) return universe;
  }
  return null;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGraphData, setActiveGraphData] = useState<GraphData | null>(null);
  const [activeUniverseTitle, setActiveUniverseTitle] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const graphDataRef = useRef<GraphData | null>(null);

  const loadUniverse = useCallback((universe: Universe) => {
    setExpandedNodes(new Set());
    const initialData: GraphData = {
      nodes: [...universe.graph.nodes],
      links: [...universe.graph.links],
    };
    graphDataRef.current = initialData;
    setActiveGraphData(initialData);
    setActiveUniverseTitle(universe.title);
    setSelectedNode(null);
    setSidebarOpen(false);
  }, []);

  const handleTagClick = useCallback(
    (universe: Universe) => loadUniverse(universe),
    [loadUniverse]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      const universe = fuzzySearch(searchQuery.trim());
      if (universe) loadUniverse(universe);
    },
    [searchQuery, loadUniverse]
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      setSidebarOpen(true);

      if (expandedNodes.has(node.id) || !graphDataRef.current) return;
      setExpandedNodes((prev) => new Set([...prev, node.id]));

      const currentData = graphDataRef.current;
      const universe = universes.find((u) =>
        u.graph.nodes.some((n) => n.id === node.id)
      );
      if (!universe) return;

      const existingIds = new Set(currentData.nodes.map((n) => n.id));
      const relatedLinks = universe.graph.links.filter(
        (l) => l.source === node.id || l.target === node.id
      );

      const newNodes: GraphNode[] = [];
      const newLinks = [];

      for (const link of relatedLinks) {
        const otherId = link.source === node.id ? link.target : link.source;
        if (!existingIds.has(otherId)) {
          const found = universe.graph.nodes.find((n) => n.id === otherId);
          if (found) {
            newNodes.push(found);
            existingIds.add(otherId);
          }
        }

        const lSrc = (l: { source: unknown; target: unknown }) =>
          typeof l.source === 'object' && l.source !== null
            ? (l.source as GraphNode).id
            : (l.source as string);
        const lTgt = (l: { source: unknown; target: unknown }) =>
          typeof l.target === 'object' && l.target !== null
            ? (l.target as GraphNode).id
            : (l.target as string);

        const alreadyLinked = currentData.links.some(
          (l) => lSrc(l) === link.source && lTgt(l) === link.target
        );
        if (!alreadyLinked) newLinks.push(link);
      }

      if (newNodes.length > 0 || newLinks.length > 0) {
        const updatedData: GraphData = {
          nodes: [...currentData.nodes, ...newNodes],
          links: [...currentData.links, ...newLinks],
        };
        graphDataRef.current = updatedData;
        setActiveGraphData({ ...updatedData });
      }
    },
    [expandedNodes]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
        <button
          onClick={() => {
            setActiveGraphData(null);
            setSelectedNode(null);
            setSidebarOpen(false);
            setActiveUniverseTitle('');
          }}
          className="flex items-center gap-2"
        >
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            스크립트 체인
          </span>
          <span className="text-xs text-slate-600 font-medium hidden sm:block">Script Chain</span>
        </button>
        {activeUniverseTitle && (
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-900">
            {activeUniverseTitle}
          </span>
        )}
        <span className="text-xs text-slate-600 hidden sm:block">시맨틱 지식 그래프</span>
      </header>

      {!activeGraphData ? (
        /* 홈 화면 */
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center mb-10 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                콘텐츠 세계관을
              </span>
              <br />
              <span className="text-white">지도로 탐험하세요</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              드라마, 영화, 소설의 인물·키워드·감성을 연결하는<br />
              인터랙티브 시맨틱 지식 그래프
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-xl mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="좋아하는 책, 드라마, 배우 또는 키워드를 입력해보세요!"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 pr-20
                  text-slate-100 placeholder-slate-500 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                  transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500
                  text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              >
                탐색
              </button>
            </div>
          </form>

          <p className="text-xs text-slate-600 mb-3 font-medium">지금 인기 있는 유니버스</p>
          <TrendingTags universes={universes} onTagClick={handleTagClick} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-2xl w-full">
            {[
              { icon: '🔍', title: '시맨틱 탐색', desc: '인물·키워드·감성을 연결하여 숨겨진 관계를 발견' },
              { icon: '🗺️', title: '세계관 지도', desc: '콘텐츠 유니버스를 시각적 그래프로 한눈에' },
              { icon: '💫', title: '과몰입 큐레이션', desc: '감성 코드 기반 추천으로 다음 콘텐츠를 발견' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </main>
      ) : (
        /* 그래프 뷰 */
        <div className="flex-1 flex relative" style={{ height: 'calc(100vh - 65px)' }}>
          <div
            className="flex-1 relative overflow-hidden"
            style={{ marginRight: sidebarOpen ? '380px' : '0', transition: 'margin 0.3s ease' }}
          >
            <SemanticGraph graphData={activeGraphData} onNodeClick={handleNodeClick} />

            {/* 검색 오버레이 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs px-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="다른 유니버스 탐색..."
                    className="w-full bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-2.5 pr-10
                      text-slate-100 placeholder-slate-500 text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 text-base">
                    🔍
                  </button>
                </div>
              </form>
            </div>

            {/* 유니버스 전환 태그 */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex gap-2 flex-wrap justify-center px-4">
              {universes.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleTagClick(u)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border
                    ${activeUniverseTitle === u.title
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900/80 backdrop-blur-sm text-slate-400 border-slate-700 hover:border-indigo-500 hover:text-indigo-300'
                    }`}
                >
                  {u.tag}
                </button>
              ))}
            </div>

            {/* 조작 도움말 */}
            <div className="absolute bottom-4 right-4 z-30 text-xs text-slate-600 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-800">
              <p>🖱️ 드래그로 이동 · 스크롤로 줌 · 노드 클릭으로 탐색</p>
            </div>
          </div>

          {/* 사이드바 */}
          <DetailSidebar
            node={selectedNode}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
