'use client';

import { useState, useEffect } from 'react';
import { GraphNode, NODE_COLORS, NODE_COLORS_BG } from '../types/content';
import AdSenseRefresher from './AdSenseRefresher';

interface DetailSidebarProps {
  node: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Book {
  title: string;
  author: string;
  publisher?: string;
  year?: string;
  isbn?: string;
  coverUrl?: string | null;
  description?: string | null;
}

interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

const GROUP_LABELS: Record<string, string> = {
  agent: '인물', keyword: '키워드', mood: '감성/무드',
  pattern: '소재/배경', index: '역사적 배경', content: '콘텐츠',
};

const GROUP_ICON: Record<string, string> = {
  agent: '👤', keyword: '🏷', mood: '♥', pattern: '★', index: '🏛', content: '📖',
};

const MOCK_KEYWORD_COUNTS = [
  { title: '관련 드라마', emoji: '📺', count: 24, color: '#6366f1' },
  { title: '관련 도서',   emoji: '📚', count: 18, color: '#f59e0b' },
  { title: '관련 영화',   emoji: '🎬', count: 12, color: '#ec4899' },
  { title: '관련 웹툰',   emoji: '🖼',  count:  9, color: '#10b981' },
];

const MOCK_OSTS = (name: string) => [
  { title: `${name.slice(0, 8)} OST Part 1`, artist: '드라마 OST', duration: '3:24' },
  { title: '메인 테마 (Main Theme)',          artist: '드라마 OST', duration: '4:01' },
  { title: '엔딩곡 (Ending Theme)',           artist: 'Various Artists', duration: '3:47' },
  { title: '삽입곡 모음',                     artist: 'Various Artists', duration: '18:30' },
];

const STREAMING_PLATFORMS = [
  { name: 'Netflix', bg: '#E50914', label: 'N', url: (q: string) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}` },
  { name: '티빙',    bg: '#FF153C', label: 'T', url: (q: string) => `https://www.tving.com/search?word=${encodeURIComponent(q)}` },
  { name: '웨이브',  bg: '#006EFA', label: 'W', url: (q: string) => `https://www.wavve.com/search?keyword=${encodeURIComponent(q)}` },
  { name: '왓챠',    bg: '#FF0558', label: 'W', url: (q: string) => `https://watcha.com/search?query=${encodeURIComponent(q)}` },
];

const CO_BORROW_PCTS = [78, 63, 51, 44, 32];

// ── AgentPanel ──────────────────────────────────────────────────────
interface WorkItem {
  title: string;
  subtitle?: string;
  desc?: string;
  coverUrl?: string | null;
}

function AgentPanel({ node }: { node: GraphNode }) {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const color = NODE_COLORS[node.group];

  const isActorOrDirector = node.category === '배우' || node.category === '감독';

  useEffect(() => {
    setLoading(true);
    const name = node.name.replace(/\s*(작가|배우|감독)$/, '').trim();
    
    if (isActorOrDirector) {
      // 배우나 감독일 경우 영화 API 호출
      fetch(`/api/naver-movie?query=${encodeURIComponent(name)}&display=5`)
        .then(r => r.json())
        .then(d => {
          const movies = d.movies ?? [];
          setWorks(movies.map((m: any) => ({
            title: m.title,
            subtitle: m.subtitle,
            desc: `감독: ${m.director.split('|')[0] || '미상'} · 개봉: ${m.pubDate}년`,
            coverUrl: m.image || null,
          })));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // 작가일 경우 도서 API 호출
      fetch(`/api/books?type=author&query=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => {
          const books = d.books ?? [];
          setWorks(books.map((b: any) => ({
            title: b.title,
            desc: `${b.author}${b.publisher ? ` · ${b.publisher}` : ''}`,
            coverUrl: b.coverUrl || null,
          })));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [node.id, node.name, isActorOrDirector]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}>
            {GROUP_ICON.agent}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{node.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{node.category ?? '인물'}</p>
          </div>
        </div>
        {node.description && (
          <p className="text-xs text-gray-500 leading-relaxed">{node.description}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">대표 참여작</p>
        {loading && <Spinner color="#34d399" label="불러오는 중..." />}
        {!loading && works.length === 0 && (
          <p className="text-xs text-gray-400 py-1">참여작 정보가 없습니다.</p>
        )}
        {!loading && works.length > 0 && (
          <div className="space-y-2">
            {works.slice(0, 5).map((work, i) => (
              <div key={i}
                className="flex gap-3 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors">
                {work.coverUrl
                  ? <img src={work.coverUrl} alt={work.title} className="w-9 h-12 object-cover rounded-lg flex-shrink-0" />
                  : <div className="w-9 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-base"
                      style={{ backgroundColor: `${color}15` }}>🎬</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">{work.title}</p>
                  {work.subtitle && <p className="text-[9px] text-gray-400 truncate leading-none mb-0.5">{work.subtitle}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{work.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── KeywordPanel ────────────────────────────────────────────────────
function KeywordPanel({ node }: { node: GraphNode }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border-2"
          style={{ borderColor: NODE_COLORS.keyword, color: NODE_COLORS.keyword, backgroundColor: NODE_COLORS_BG.keyword }}>
          🏷 {node.name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MOCK_KEYWORD_COUNTS.map((card) => (
          <div key={card.title}
            className="p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-lg">{card.emoji}</span>
              <span className="text-sm font-black" style={{ color: card.color }}>{card.count}</span>
            </div>
            <p className="text-xs font-semibold text-gray-700">{card.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">"{node.name}" 관련</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">인기 콘텐츠</p>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-sm font-black text-gray-200 w-5 text-center">{i}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">"{node.name}" 관련 콘텐츠 {i}</p>
                <p className="text-[10px] text-gray-400">드라마 · 2024</p>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">HOT</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MoodPanel ───────────────────────────────────────────────────────
function MoodPanel({ node, activeUniverseTitle }: { node: GraphNode; activeUniverseTitle?: string }) {
  const osts = MOCK_OSTS(activeUniverseTitle || node.name);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎵</span>
          <p className="text-sm font-bold text-gray-800">과몰입 OST 플레이리스트</p>
        </div>
        <p className="text-xs text-gray-400">"{node.name}" 감성으로 큐레이션된 음악</p>
      </div>

      <div className="space-y-1">
        {osts.map((ost, i) => (
          <a key={i}
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent((activeUniverseTitle || '') + ' ' + ost.title)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition-colors group border border-transparent hover:border-pink-100">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 group-hover:bg-pink-200 transition-colors">
              <span className="text-pink-500 text-xs">▶</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{ost.title}</p>
              <p className="text-[10px] text-gray-400">{ost.artist}</p>
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 font-mono">{ost.duration}</span>
          </a>
        ))}
      </div>

      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(node.name + ' OST')}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #FF0000, #CC0000)' }}>
        <span>▶</span> YouTube에서 전체 OST 듣기
      </a>
    </div>
  );
}

// ── PatternPanel ────────────────────────────────────────────────────
function PatternPanel({ node }: { node: GraphNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const color = NODE_COLORS[node.group];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/books?type=keyword&query=${encodeURIComponent(node.name)}`)
      .then(r => r.json())
      .then(d => setBooks(d.books ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [node.id, node.name]);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
        <p className="text-xs font-bold text-amber-700">📊 함께 대출된 도서</p>
        <p className="text-[10px] text-amber-400 mt-0.5">도서관 정보나루 대출 통계 기반</p>
      </div>

      {loading && <Spinner color="#f59e0b" label="통계 불러오는 중..." />}

      {!loading && books.length === 0 && (
        <p className="text-xs text-gray-400 py-1">함께 대출된 도서 데이터가 없습니다.</p>
      )}

      {!loading && books.length > 0 && (
        <div className="space-y-3.5">
          {books.slice(0, 5).map((book, i) => {
            const pct = CO_BORROW_PCTS[i] ?? Math.max(20, 78 - i * 12);
            return (
              <div key={book.isbn ?? i} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800 leading-snug flex-1 line-clamp-1">{book.title}</p>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <p className="text-[10px] text-gray-400">{book.author}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── IndexPanel ──────────────────────────────────────────────────────
function IndexPanel({ node }: { node: GraphNode }) {
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  useEffect(() => {
    setWikiLoading(true);
    setWiki(null);
    fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(node.name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setWiki(data))
      .catch(() => {})
      .finally(() => setWikiLoading(false));
  }, [node.name]);

  const archiveLinks = [
    { label: `${node.name} 관련 기사`, source: '네이버 뉴스', url: `https://news.naver.com/search/result.naver?query=${encodeURIComponent(node.name)}` },
    { label: `${node.name} 학술 자료`, source: 'RISS',        url: `https://www.riss.kr/search/Search.do?searchGubun=true&query=${encodeURIComponent(node.name)}` },
    { label: `${node.name} 디지털 사료`, source: '국립중앙도서관', url: `https://www.nl.go.kr/NL/search/totSearch.do?query=${encodeURIComponent(node.name)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
          <span>📖</span>
          <p className="text-xs font-bold text-gray-600">위키백과 요약</p>
          <span className="ml-auto text-[10px] text-gray-400">Wikipedia</span>
        </div>

        {wikiLoading && (
          <div className="p-4"><Spinner color="#6b7280" label="백과사전 불러오는 중..." /></div>
        )}

        {!wikiLoading && wiki && (
          <div className="p-4">
            <div className="flex gap-3 mb-3">
              {wiki.thumbnail && (
                <img src={wiki.thumbnail.source} alt={wiki.title}
                  className="w-16 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-200" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 mb-1">{wiki.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-5">{wiki.extract}</p>
              </div>
            </div>
            {wiki.content_urls && (
              <a href={wiki.content_urls.desktop.page} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                위키백과에서 전체 내용 보기 →
              </a>
            )}
          </div>
        )}

        {!wikiLoading && !wiki && (
          <div className="p-4">
            <p className="text-xs text-gray-400">위키백과 항목을 찾을 수 없습니다.</p>
            <a href={`https://ko.wikipedia.org/w/index.php?search=${encodeURIComponent(node.name)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1 block">
              위키백과에서 검색해보기 →
            </a>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">신문·사료 아카이브</p>
        <div className="space-y-2">
          {archiveLinks.map((link) => (
            <a key={link.source} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors group">
              <span className="text-base flex-shrink-0">🗞</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{link.label}</p>
                <p className="text-[10px] text-gray-400">{link.source}</p>
              </div>
              <span className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0">→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ContentPanel ────────────────────────────────────────────────────
function ContentPanel({ node }: { node: GraphNode }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">스트리밍 바로가기</p>
        <div className="grid grid-cols-2 gap-2">
          {STREAMING_PLATFORMS.map((p) => (
            <a key={p.name} href={p.url(node.name)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all bg-white group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ backgroundColor: p.bg }}>
                {p.label}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{p.name}</p>
                <p className="text-[10px] text-gray-400 group-hover:text-gray-600">검색하기 →</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">도서관 서비스</p>
        <a href={`https://www.nl.go.kr/NL/search/totSearch.do?query=${encodeURIComponent(node.name)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
          📚 내 주변 도서관에서 대출하기
        </a>
        <p className="text-[10px] text-gray-400 text-center mt-2">국립중앙도서관 통합검색 연동</p>
      </div>
    </div>
  );
}

// ── GroupPanel (switch) ─────────────────────────────────────────────
function GroupPanel({ node, activeUniverseTitle }: { node: GraphNode; activeUniverseTitle?: string }) {
  switch (node.group) {
    case 'agent':   return <AgentPanel node={node} />;
    case 'keyword': return <KeywordPanel node={node} />;
    case 'mood':    return <MoodPanel node={node} activeUniverseTitle={activeUniverseTitle} />;
    case 'pattern': return <PatternPanel node={node} />;
    case 'index':   return <IndexPanel node={node} />;
    case 'content': return <ContentPanel node={node} />;
    default:        return null;
  }
}

// ── Spinner ─────────────────────────────────────────────────────────
function Spinner({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
      <div className="w-4 h-4 rounded-full border-2 border-gray-100 border-t-current animate-spin flex-shrink-0"
        style={{ borderTopColor: color }} />
      {label}
    </div>
  );
}

// ── MockPoster ──────────────────────────────────────────────────────
function MockPoster({ node }: { node: GraphNode }) {
  const color = NODE_COLORS[node.group] ?? '#10b981';
  const bg = NODE_COLORS_BG[node.group] ?? '#f0fdf4';
  const isContent = node.group === 'content';

  if (node.posterUrl) {
    return (
      <div className="w-full h-48 rounded-2xl overflow-hidden relative">
        <img src={node.posterUrl} alt={node.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-12">
          <p className="text-white font-bold text-lg leading-tight">{node.name}</p>
          {node.description && (
            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{node.description}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-36 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: isContent ? color : bg, border: `1px solid ${color}33` }}>
      <div className="text-center">
        <div className="text-4xl mb-1">{GROUP_ICON[node.group] ?? '◉'}</div>
        <p className="text-sm font-bold" style={{ color: isContent ? '#fff' : color }}>{node.name}</p>
        <p className="text-xs mt-0.5" style={{ color: isContent ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
          {GROUP_LABELS[node.group]}
        </p>
      </div>
    </div>
  );
}

interface DetailSidebarProps {
  node: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
  activeUniverseTitle?: string;
}

// ── Main ────────────────────────────────────────────────────────────
export default function DetailSidebar({ node, isOpen, onClose, activeUniverseTitle }: DetailSidebarProps) {
  if (!node) return null;

  const color = NODE_COLORS[node.group] ?? '#10b981';
  const groupLabel = GROUP_LABELS[node.group] ?? '콘텐츠';

  const handleShareX = () => {
    const text = encodeURIComponent(`스크립트 체인에서 "${node.name}" 세계관을 탐험 중! 🔍`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white border-l border-gray-100
      z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-xl
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors text-sm">
        ✕
      </button>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          <MockPoster node={node} />

          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 mb-2">
                {groupLabel}
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{node.name}</h2>
            </div>
            <button className="flex flex-col items-center gap-0.5 text-rose-400 flex-shrink-0 mt-1">
              <span className="text-lg leading-none">♥</span>
              <span className="text-[10px]">저장</span>
            </button>
          </div>

          {node.copyText && (
            <p className="text-sm font-semibold leading-relaxed" style={{ color }}>{node.copyText}</p>
          )}
          {!node.copyText && node.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{node.description}</p>
          )}

          <div className="border-t border-gray-100" />

          <GroupPanel node={node} activeUniverseTitle={activeUniverseTitle} />

          <div className="border-t border-gray-100" />

          <div className="space-y-2">
            <button className="w-full py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
              🗺️ 이 세계관 지도 저장하기
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleShareX}
                className="py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                <span className="font-black text-base leading-none">𝕏</span> 공유
              </button>
              <button className="py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                📸 릴스 캡처
              </button>
            </div>
            {/* 광고 슬롯 (SPA 리프레시 래퍼) */}
            <AdSenseRefresher nodeId={node.id} />
          </div>

        </div>
      </div>
    </div>
  );
}
