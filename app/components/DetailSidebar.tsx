'use client';

import { useState, useEffect } from 'react';
import { GraphNode, NODE_COLORS } from '../types/content';

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
  ranking?: string;
}

const GROUP_LABELS: Record<string, string> = {
  agent: '인물',
  keyword: '키워드',
  mood: '감성/무드',
  pattern: '소비 패턴',
  index: '역사적 배경',
  content: '콘텐츠',
};

function MockPoster({ node }: { node: GraphNode }) {
  const color = NODE_COLORS[node.group] ?? '#3b82f6';
  const label = GROUP_LABELS[node.group] ?? '콘텐츠';
  return (
    <div
      className="w-full h-44 rounded-xl flex items-center justify-center relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)` }}
    >
      <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)` }} />
      <div className="text-center z-10">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl"
          style={{ backgroundColor: `${color}33`, border: `2px solid ${color}66` }}>
          {node.group === 'agent' && '👤'}
          {node.group === 'keyword' && '🔑'}
          {node.group === 'mood' && '💫'}
          {node.group === 'pattern' && '📊'}
          {node.group === 'index' && '📜'}
          {node.group === 'content' && '🎬'}
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: `${color}33`, color }}>{label}</span>
      </div>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <div className="flex gap-3 p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
      ) : (
        <div className="w-10 h-14 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center text-lg">📚</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{book.author}</p>
        {book.year && <p className="text-xs text-slate-600 mt-0.5">{book.year}</p>}
      </div>
    </div>
  );
}

function BookSection({ node }: { node: GraphNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // 작가 노드인지 판별
  const isAuthor = node.group === 'agent' && node.category === '작가';
  // 책/콘텐츠 노드인지 판별 (isbn이 있으면 관련 도서 조회)
  const hasIsbn = !!node.description?.match(/isbn/i) || false;
  // 키워드 노드
  const isKeyword = node.group === 'keyword';

  useEffect(() => {
    let url = '';
    if (isAuthor) {
      // 작가 이름에서 "작가" 제거
      const authorName = node.name.replace(/\s*작가$/, '').trim();
      url = `/api/books?type=author&query=${encodeURIComponent(authorName)}`;
    } else if (isKeyword) {
      url = `/api/books?type=keyword&query=${encodeURIComponent(node.name)}`;
    } else {
      return;
    }

    setLoading(true);
    setError(false);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setBooks(data.books ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [node.id, isAuthor, isKeyword, node.name]);

  if (!isAuthor && !isKeyword) return null;

  const sectionTitle = isAuthor ? '저서 목록' : '관련 도서';

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-slate-200">📚 {sectionTitle}</span>
        <span className="text-xs text-slate-500">도서관 정보나루</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
          도서 정보 불러오는 중...
        </div>
      )}

      {error && (
        <p className="text-xs text-slate-500 py-2">도서 정보를 불러오지 못했습니다.</p>
      )}

      {!loading && !error && books.length === 0 && (
        <p className="text-xs text-slate-500 py-2">관련 도서가 없습니다.</p>
      )}

      {!loading && books.length > 0 && (
        <div className="flex flex-col gap-2">
          {books.slice(0, 5).map((book, i) => (
            <BookCard key={book.isbn ?? i} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailSidebar({ node, isOpen, onClose }: DetailSidebarProps) {
  if (!node) return null;

  const color = NODE_COLORS[node.group] ?? '#3b82f6';
  const groupLabel = GROUP_LABELS[node.group] ?? '콘텐츠';

  const handleShareX = () => {
    const text = encodeURIComponent(`스크립트 체인에서 "${node.name}" 세계관을 탐험 중! 🔍`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-slate-900 border-l border-slate-800
        z-50 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
        <span className="text-sm font-medium text-slate-400">노드 상세</span>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          ✕
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <MockPoster node={node} />

        {/* 뱃지 + 제목 */}
        <div>
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2"
            style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>
            {groupLabel}
          </span>
          <h2 className="text-xl font-bold text-white leading-tight">{node.name}</h2>
        </div>

        {/* 카피 */}
        {node.copyText && (
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
            <p className="text-sm text-slate-200 leading-relaxed italic">"{node.copyText}"</p>
          </div>
        )}

        {/* 설명 */}
        {node.description && (
          <p className="text-sm text-slate-400 leading-relaxed">{node.description}</p>
        )}

        {/* 도서관 API 섹션 */}
        <BookSection node={node} />

        {/* 구분선 */}
        <div className="border-t border-slate-800" />

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-2">
          <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
            bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95">
            🗺️ 이 세계관 지도 저장하기
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleShareX}
              className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all bg-slate-700 hover:bg-slate-600 active:scale-95">
              𝕏 X에 공유하기
            </button>
            <button className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all
              bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 active:scale-95">
              📸 릴스용 캡처
            </button>
          </div>
        </div>

        {/* 광고 슬롯 */}
        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/50 p-4 text-center">
          <p className="text-xs text-slate-500 mb-1 font-medium">[ 구글 애드센스 광고 영역 ]</p>
          <div className="h-24 flex items-center justify-center">
            <p className="text-xs text-slate-600">광고가 이곳에 표시됩니다</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-center">
          <p className="text-xs text-slate-600">[ 배너 광고 슬롯 300×100 ]</p>
          <div className="h-12 flex items-center justify-center">
            <p className="text-xs text-slate-700">관련 콘텐츠 광고</p>
          </div>
        </div>
      </div>
    </div>
  );
}
