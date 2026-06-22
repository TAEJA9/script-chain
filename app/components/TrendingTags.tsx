'use client';

import { Universe } from '../types/content';

interface TrendingTagsProps {
  universes: Universe[];
  onTagClick: (universe: Universe) => void;
  activeTitle?: string;
}

export default function TrendingTags({ universes, onTagClick, activeTitle }: TrendingTagsProps) {
  return (
    <div className="h-12 flex items-center border-b border-gray-100 px-6 gap-4 bg-white sticky top-[60px] z-30 flex-shrink-0">
      <span className="text-xs font-semibold text-gray-400 flex-shrink-0 whitespace-nowrap">인기 세계관 태그</span>
      <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {universes.map((u) => (
          <button
            key={u.id}
            onClick={() => onTagClick(u)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all
              ${activeTitle === u.title
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'text-emerald-600 border-emerald-300 bg-white hover:bg-emerald-50'
              }`}
          >
            # {u.tag.replace(/^#\s*/, '')}
          </button>
        ))}
      </div>
      <button className="flex-shrink-0 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 text-base leading-none">
        ›
      </button>
    </div>
  );
}
