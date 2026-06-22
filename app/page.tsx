'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode, Universe, NODE_COLORS } from './types/content';
import TrendingTags from './components/TrendingTags';
import DetailSidebar from './components/DetailSidebar';
import mockData from './data/mockUniverses.json';
import { NaverBook } from './api/naver-books/route';
import { NaverMovie } from './api/naver-movie/route';
import { GraphControls } from './components/SemanticGraph';

const SemanticGraph = dynamic(() => import('./components/SemanticGraph'), { ssr: false });

const universes: Universe[] = mockData.universes as Universe[];

function fuzzySearch(query: string): Universe | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  for (const universe of universes) {
    if (
      universe.title.toLowerCase().replace(/\s+/g, '').includes(q) ||
      universe.tag.toLowerCase().replace(/\s+/g, '').includes(q)
    ) return universe;
    if (universe.graph.nodes.some(
      (n) => n.name.toLowerCase().replace(/\s+/g, '').includes(q) ||
             (n.description ?? '').toLowerCase().replace(/\s+/g, '').includes(q)
    )) return universe;
  }
  return null;
}

function isPersonQuery(query: string, movies: NaverMovie[]): boolean {
  const q = query.replace(/\s+/g, '');
  return movies.some((m) => {
    const actors = m.actor.split('|').map(a => a.replace(/\s+/g, ''));
    const directors = m.director.split('|').map(d => d.replace(/\s+/g, ''));
    return actors.some(a => a.includes(q) || q.includes(a)) ||
           directors.some(d => d.includes(q) || q.includes(d));
  });
}

function moviesToGraph(query: string, movies: NaverMovie[]): GraphData {
  const nodes: GraphNode[] = [];
  const links = [];
  const actorSeen = new Set<string>();

  const personId = `person-${query}`;
  nodes.push({ id: personId, name: query, group: 'agent', category: '배우/감독', description: `${query} 출연 작품` });

  for (const movie of movies.slice(0, 8)) {
    const movieId = `movie-${movie.link || movie.title}`;
    const year = movie.pubDate ? movie.pubDate.slice(0, 4) : '';
    nodes.push({
      id: movieId,
      name: movie.title.length > 12 ? movie.title.slice(0, 12) + '…' : movie.title,
      group: 'content', category: '영화/드라마',
      description: [movie.director && `감독: ${movie.director.split('|')[0]}`, year && `${year}년`, movie.userRating !== '0' && `★ ${movie.userRating}`].filter(Boolean).join(' · '),
      posterUrl: movie.image,
    });
    links.push({ source: personId, target: movieId, label: '출연' });

    const actors = movie.actor.split('|').map(a => a.trim()).filter(Boolean).filter(a => a !== query);
    for (const actor of actors.slice(0, 2)) {
      if (!actorSeen.has(actor) && nodes.length < 20) {
        actorSeen.add(actor);
        const actorId = `actor-${actor}`;
        if (!nodes.find(n => n.id === actorId)) {
          nodes.push({ id: actorId, name: actor.length > 6 ? actor.slice(0, 6) + '…' : actor, group: 'agent', category: '배우', description: `${actor} 배우` });
        }
        links.push({ source: actorId, target: movieId, label: '출연' });
      }
    }
  }
  return { nodes, links };
}

function booksToGraph(query: string, books: NaverBook[]): GraphData {
  const nodes: GraphNode[] = [];
  const links = [];
  const authorSeen = new Set<string>();

  const kwId = `kw-${query}`;
  nodes.push({ id: kwId, name: query, group: 'keyword', category: '검색 키워드', description: `"${query}" 검색 결과` });

  for (const book of books.slice(0, 6)) {
    const bookId = `book-${book.isbn || book.title}`;
    nodes.push({
      id: bookId,
      name: book.title.length > 12 ? book.title.slice(0, 12) + '…' : book.title,
      group: 'content', category: '도서',
      description: book.description.slice(0, 80) || `${book.publisher} · ${book.pubdate.slice(0, 4)}`,
      posterUrl: book.image,
      copyText: book.description.slice(0, 100) || undefined,
    });
    links.push({ source: kwId, target: bookId, label: '검색 결과' });

    const authors = book.author.split('|').map(a => a.trim()).filter(Boolean);
    for (const author of authors.slice(0, 2)) {
      if (!authorSeen.has(author)) {
        authorSeen.add(author);
        const authorId = `author-${author}`;
        if (!nodes.find(n => n.id === authorId)) {
          nodes.push({ id: authorId, name: author.length > 8 ? author.slice(0, 8) + '…' : author, group: 'agent', category: '작가', description: `${author} 저자의 작품` });
        }
        links.push({ source: authorId, target: bookId, label: '지음' });
      }
    }
  }
  return { nodes, links };
}

const GROUP_LEGEND = [
  { group: 'agent',   label: '인물',       icon: '👤' },
  { group: 'keyword', label: '키워드',     icon: '🏷' },
  { group: 'mood',    label: '감성/무드',  icon: '♥' },
  { group: 'pattern', label: '소재/배경',  icon: '★' },
  { group: 'index',   label: '역사적 배경', icon: '🏛' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGraphData, setActiveGraphData] = useState<GraphData | null>(null);
  const [activeUniverseTitle, setActiveUniverseTitle] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [showTooltip, setShowTooltip] = useState(true);
  const graphDataRef = useRef<GraphData | null>(null);
  const graphControlsRef = useRef<GraphControls | null>(null);

  const loadUniverse = useCallback((universe: Universe) => {
    setExpandedNodes(new Set());
    const data: GraphData = { nodes: [...universe.graph.nodes], links: [...universe.graph.links] };
    graphDataRef.current = data;
    setActiveGraphData(data);
    setActiveUniverseTitle(universe.title);
    setSelectedNode(null);
    setSidebarOpen(false);
  }, []);

  const loadBookGraph = useCallback((query: string, books: NaverBook[]) => {
    setExpandedNodes(new Set());
    const data = booksToGraph(query, books);
    graphDataRef.current = data;
    setActiveGraphData(data);
    setActiveUniverseTitle(`"${query}" 도서 검색`);
    setSelectedNode(null);
    setSidebarOpen(false);
  }, []);

  const loadMovieGraph = useCallback((query: string, movies: NaverMovie[]) => {
    setExpandedNodes(new Set());
    const data = moviesToGraph(query, movies);
    graphDataRef.current = data;
    setActiveGraphData(data);
    setActiveUniverseTitle(`"${query}" 필모그래피`);
    setSelectedNode(null);
    setSidebarOpen(false);
  }, []);

  const handleTagClick = useCallback((universe: Universe) => loadUniverse(universe), [loadUniverse]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearchError('');

    const universe = fuzzySearch(q);
    if (universe) { loadUniverse(universe); return; }

    setIsSearching(true);
    try {
      const [movieRes, bookRes] = await Promise.all([
        fetch(`/api/naver-movie?query=${encodeURIComponent(q)}&display=8`),
        fetch(`/api/naver-books?query=${encodeURIComponent(q)}&display=8`),
      ]);
      const [movieData, bookData] = await Promise.all([movieRes.json(), bookRes.json()]);
      const movies: NaverMovie[] = movieData.movies ?? [];
      const books: NaverBook[] = bookData.books ?? [];

      if (movies.length > 0 && isPersonQuery(q, movies)) {
        loadMovieGraph(q, movies);
      } else if (movies.length > 0 && books.length === 0) {
        loadMovieGraph(q, movies);
      } else if (books.length > 0) {
        loadBookGraph(q, books);
      } else {
        setSearchError(`"${q}"에 대한 검색 결과가 없습니다. 다른 키워드로 시도해보세요.`);
      }
    } catch {
      setSearchError('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, loadUniverse, loadBookGraph, loadMovieGraph]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setSidebarOpen(true);

    if (expandedNodes.has(node.id) || !graphDataRef.current) return;
    setExpandedNodes((prev) => new Set([...prev, node.id]));

    const currentData = graphDataRef.current;
    const universe = universes.find((u) => u.graph.nodes.some((n) => n.id === node.id));
    if (!universe) return;

    const existingIds = new Set(currentData.nodes.map((n) => n.id));
    const relatedLinks = universe.graph.links.filter(l => l.source === node.id || l.target === node.id);
    const newNodes: GraphNode[] = [];
    const newLinks = [];

    for (const link of relatedLinks) {
      const otherId = link.source === node.id ? link.target : link.source;
      if (!existingIds.has(otherId)) {
        const found = universe.graph.nodes.find((n) => n.id === otherId);
        if (found) { newNodes.push(found); existingIds.add(otherId); }
      }
      const getId = (v: unknown) => typeof v === 'object' && v !== null ? (v as GraphNode).id : v as string;
      if (!currentData.links.some(l => getId(l.source) === link.source && getId(l.target) === link.target)) {
        newLinks.push(link);
      }
    }

    if (newNodes.length > 0 || newLinks.length > 0) {
      const updated = { nodes: [...currentData.nodes, ...newNodes], links: [...currentData.links, ...newLinks] };
      graphDataRef.current = updated;
      setActiveGraphData({ ...updated });
    }
  }, [expandedNodes]);

  const resetHome = () => {
    setActiveGraphData(null);
    setSelectedNode(null);
    setSidebarOpen(false);
    setActiveUniverseTitle('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="h-[60px] grid items-center border-b border-gray-100 bg-white sticky top-0 z-40 px-6"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}>

        {/* 로고 */}
        <button onClick={resetHome} className="flex items-center gap-2 w-fit">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#10b981" fillOpacity="0.12" />
            <path d="M9 10c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M9 18c0 2.8 2.2 5 5 5s5-2.2 5-5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M14 5v18" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round" />
          </svg>
          <span className="text-base font-bold text-gray-900">스크립트 체인</span>
        </button>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="w-[460px]">
          <div className="flex items-center border-2 border-emerald-500 rounded-full px-4 py-2 bg-white gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="좋아하는 책, 드라마, 배우 또는 키워드를 입력해보세요!"
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none min-w-0"
            />
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono flex-shrink-0">
              {isSearching ? '...' : '⌘ K'}
            </span>
          </div>
        </form>

        {/* 네비 */}
        <div className="flex items-center gap-4 justify-end">
          <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium">
            <span className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center text-[9px] font-bold text-gray-400">i</span>
            소개
          </button>
          <button className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 font-medium transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            로그인
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Tag bar ── */}
      <TrendingTags universes={universes} onTagClick={handleTagClick} activeTitle={activeUniverseTitle} />

      {!activeGraphData ? (

        /* ── Landing ── */
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center mb-12 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">콘텐츠 세계관을</span>
              <br />
              <span className="text-gray-900">지도로 탐험하세요</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed">
              드라마, 영화, 소설의 인물·키워드·감성을 연결하는<br />
              인터랙티브 시맨틱 지식 그래프
            </p>
          </div>

          {searchError && (
            <div className="w-full max-w-xl mb-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 text-center">
              {searchError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
            {[
              { icon: '🔍', title: '시맨틱 탐색', desc: '인물·키워드·감성을 연결하여 숨겨진 관계를 발견' },
              { icon: '📚', title: '도서 검색', desc: '책 제목 입력 → 저자·관련 도서 그래프 자동 생성' },
              { icon: '💫', title: '과몰입 큐레이션', desc: '감성 코드 기반 추천으로 다음 콘텐츠를 발견' },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow cursor-default">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold text-gray-800 mb-1.5">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </main>

      ) : (

        /* ── Graph view ── */
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 108px)' }}>

          {/* 왼쪽 패널 */}
          <aside className="w-[188px] flex-shrink-0 border-r border-gray-100 bg-white flex flex-col p-4 overflow-y-auto">

            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">노드 범례</p>
              <div className="flex flex-col gap-2.5">
                {GROUP_LEGEND.map(({ group, label, icon }) => (
                  <div key={group} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: `${NODE_COLORS[group as keyof typeof NODE_COLORS]}1a`, color: NODE_COLORS[group as keyof typeof NODE_COLORS] }}>
                      {icon}
                    </span>
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">보기 설정</p>
              <label className="flex items-center gap-2 mb-2.5 cursor-pointer">
                <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)}
                  className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" />
                <span className="text-xs text-gray-600">관계 라벨 보기</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showTooltip} onChange={(e) => setShowTooltip(e.target.checked)}
                  className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" />
                <span className="text-xs text-gray-600">툴팁 미리 보기</span>
              </label>
            </div>

            <div className="flex flex-col gap-2 mb-5">
              <button onClick={() => graphControlsRef.current?.reheat()}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span>↺</span> 초기화
              </button>
              <button onClick={() => graphControlsRef.current?.fitAll()}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span>⊞</span> 전체 보기
              </button>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-3.5 h-3.5 rounded-full border border-emerald-400 flex items-center justify-center text-[8px] text-emerald-500 font-bold">i</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">그래프 정보</p>
              </div>
              <p className="text-xs text-gray-500">
                노드 <span className="font-semibold text-gray-800">{activeGraphData.nodes.length}개</span>
                &nbsp;|&nbsp;
                관계 <span className="font-semibold text-gray-800">{activeGraphData.links.length}개</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-xs text-gray-400">마지막 업데이트 방금 전</p>
                <button onClick={() => graphControlsRef.current?.reheat()}
                  className="text-gray-400 hover:text-gray-600 text-xs transition-colors">↺</button>
              </div>
            </div>
          </aside>

          {/* 중앙 그래프 */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 relative overflow-hidden">
              <SemanticGraph
                graphData={activeGraphData}
                onNodeClick={handleNodeClick}
                showLabels={showLabels}
                showTooltip={showTooltip}
                controlRef={graphControlsRef}
              />

              {/* 줌 컨트롤 (우상단) */}
              <div className="absolute top-4 right-4 z-20 flex gap-1.5">
                {[
                  { label: '−', action: () => {} },
                  { label: '+', action: () => {} },
                  { label: '⊡', action: () => graphControlsRef.current?.fitAll() },
                  { label: '⊞', action: () => setSidebarOpen(s => !s) },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 하단 바 */}
            <div className="h-10 border-t border-gray-100 flex items-center px-4 justify-between bg-white flex-shrink-0">
              <p className="text-xs text-gray-400">ⓘ 노드를 클릭하면 더 많은 연결을 탐색할 수 있어요!</p>
              <p className="text-xs text-gray-400 hidden sm:block">드래그 또는 마우스 휠로 이동 &nbsp;|&nbsp; 클릭으로 선택</p>
            </div>
          </div>

          {/* 오른쪽 사이드바 */}
          <DetailSidebar node={selectedNode} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />
          )}
        </div>
      )}
    </div>
  );
}
