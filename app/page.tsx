'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode, Universe } from './types/content';
import TrendingTags from './components/TrendingTags';
import DetailSidebar from './components/DetailSidebar';
import mockData from './data/mockUniverses.json';
import { NaverBook } from './api/naver-books/route';
import { NaverMovie } from './api/naver-movie/route';

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

// 배우/감독이 검색어와 일치하는지 확인 (영화 API 우선 사용 판단)
function isPersonQuery(query: string, movies: NaverMovie[]): boolean {
  const q = query.replace(/\s+/g, '');
  return movies.some((m) => {
    const actors = m.actor.split('|').map(a => a.replace(/\s+/g, ''));
    const directors = m.director.split('|').map(d => d.replace(/\s+/g, ''));
    return actors.some(a => a.includes(q) || q.includes(a)) ||
           directors.some(d => d.includes(q) || q.includes(d));
  });
}

// 네이버 영화 검색 결과 → 그래프 데이터 변환
function moviesToGraph(query: string, movies: NaverMovie[]): GraphData {
  const nodes: GraphNode[] = [];
  const links = [];
  const actorSeen = new Set<string>();

  // 인물 노드 (검색어)
  const personId = `person-${query}`;
  nodes.push({
    id: personId,
    name: query,
    group: 'agent',
    category: '배우/감독',
    description: `${query} 출연 작품`,
  });

  for (const movie of movies.slice(0, 8)) {
    const movieId = `movie-${movie.link || movie.title}`;
    const year = movie.pubDate ? movie.pubDate.slice(0, 4) : '';
    nodes.push({
      id: movieId,
      name: movie.title.length > 12 ? movie.title.slice(0, 12) + '…' : movie.title,
      group: 'content',
      category: '영화/드라마',
      description: [movie.director && `감독: ${movie.director.split('|')[0]}`, year && `${year}년`, movie.userRating !== '0' && `★ ${movie.userRating}`].filter(Boolean).join(' · '),
      posterUrl: movie.image,
    });
    links.push({ source: personId, target: movieId, label: '출연' });

    // 공동 출연 배우 (처음 2명)
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

// 네이버 책 검색 결과 → 그래프 데이터 변환
function booksToGraph(query: string, books: NaverBook[]): GraphData {
  const nodes: GraphNode[] = [];
  const links = [];
  const authorSeen = new Set<string>();

  // 검색어 키워드 노드
  const kwId = `kw-${query}`;
  nodes.push({ id: kwId, name: query, group: 'keyword', category: '검색 키워드', description: `"${query}" 검색 결과` });

  for (const book of books.slice(0, 6)) {
    const bookId = `book-${book.isbn || book.title}`;
    nodes.push({
      id: bookId,
      name: book.title.length > 12 ? book.title.slice(0, 12) + '…' : book.title,
      group: 'content',
      category: '도서',
      description: book.description.slice(0, 80) || `${book.publisher} · ${book.pubdate.slice(0, 4)}`,
      posterUrl: book.image,
      copyText: book.description.slice(0, 100) || undefined,
    });
    links.push({ source: kwId, target: bookId, label: '검색 결과' });

    // 저자 노드 (중복 방지)
    const authors = book.author.split('|').map(a => a.trim()).filter(Boolean);
    for (const author of authors.slice(0, 2)) {
      if (!authorSeen.has(author)) {
        authorSeen.add(author);
        const authorId = `author-${author}`;
        if (!nodes.find(n => n.id === authorId)) {
          nodes.push({
            id: authorId,
            name: author.length > 8 ? author.slice(0, 8) + '…' : author,
            group: 'agent',
            category: '작가',
            description: `${author} 저자의 작품`,
          });
        }
        links.push({ source: authorId, target: bookId, label: '지음' });
      }
    }
  }

  return { nodes, links };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGraphData, setActiveGraphData] = useState<GraphData | null>(null);
  const [activeUniverseTitle, setActiveUniverseTitle] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const graphDataRef = useRef<GraphData | null>(null);

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

    // 1. 기존 유니버스 매칭
    const universe = fuzzySearch(q);
    if (universe) { loadUniverse(universe); return; }

    // 2. 네이버 영화 + 책 API 병렬 검색
    setIsSearching(true);
    try {
      const [movieRes, bookRes] = await Promise.all([
        fetch(`/api/naver-movie?query=${encodeURIComponent(q)}&display=8`),
        fetch(`/api/naver-books?query=${encodeURIComponent(q)}&display=8`),
      ]);
      const [movieData, bookData] = await Promise.all([movieRes.json(), bookRes.json()]);

      const movies: NaverMovie[] = movieData.movies ?? [];
      const books: NaverBook[] = bookData.books ?? [];

      // 배우/감독 이름이면 영화 필모그래피 우선
      if (movies.length > 0 && isPersonQuery(q, movies)) {
        loadMovieGraph(q, movies);
      } else if (movies.length > 0 && books.length === 0) {
        // 영화 제목 검색
        loadMovieGraph(q, movies);
      } else if (books.length > 0) {
        loadBookGraph(q, books);
      }
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
    setActiveGraphData(null); setSelectedNode(null);
    setSidebarOpen(false); setActiveUniverseTitle('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
        <button onClick={resetHome} className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">스크립트 체인</span>
          <span className="text-xs text-slate-600 font-medium hidden sm:block">Script Chain</span>
        </button>
        {activeUniverseTitle && (
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-900 max-w-[200px] truncate">
            {activeUniverseTitle}
          </span>
        )}
        <span className="text-xs text-slate-600 hidden sm:block">시맨틱 지식 그래프</span>
      </header>

      {!activeGraphData ? (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center mb-10 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">콘텐츠 세계관을</span>
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
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 pr-24
                  text-slate-100 placeholder-slate-500 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60
                  text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors min-w-[60px]"
              >
                {isSearching ? '검색 중' : '탐색'}
              </button>
            </div>
          </form>

          <p className="text-xs text-slate-600 mb-3 font-medium">지금 인기 있는 유니버스</p>
          <TrendingTags universes={universes} onTagClick={handleTagClick} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-2xl w-full">
            {[
              { icon: '🔍', title: '시맨틱 탐색', desc: '인물·키워드·감성을 연결하여 숨겨진 관계를 발견' },
              { icon: '📚', title: '도서 검색', desc: '책 제목 입력 → 저자·관련 도서 그래프 자동 생성' },
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
        <div className="flex-1 flex relative" style={{ height: 'calc(100vh - 65px)' }}>
          <div className="flex-1 relative overflow-hidden" style={{ marginRight: sidebarOpen ? '380px' : '0', transition: 'margin 0.3s ease' }}>
            <SemanticGraph graphData={activeGraphData} onNodeClick={handleNodeClick} />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs px-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="책 제목, 드라마, 키워드 검색..."
                    className="w-full bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-2.5 pr-10
                      text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button type="submit" disabled={isSearching} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 text-base disabled:opacity-50">
                    {isSearching ? '⏳' : '🔍'}
                  </button>
                </div>
              </form>
            </div>

            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex gap-2 flex-wrap justify-center px-4">
              {universes.map((u) => (
                <button key={u.id} onClick={() => handleTagClick(u)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border
                    ${activeUniverseTitle === u.title
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900/80 backdrop-blur-sm text-slate-400 border-slate-700 hover:border-indigo-500 hover:text-indigo-300'}`}>
                  {u.tag}
                </button>
              ))}
            </div>

            <div className="absolute bottom-4 right-4 z-30 text-xs text-slate-600 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-800">
              🖱️ 드래그로 이동 · 스크롤로 줌 · 노드 클릭으로 탐색
            </div>
          </div>

          <DetailSidebar node={selectedNode} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />}
        </div>
      )}
    </div>
  );
}
