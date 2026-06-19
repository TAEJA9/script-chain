'use client';

import { Universe } from '../types/content';

interface TrendingTagsProps {
  universes: Universe[];
  onTagClick: (universe: Universe) => void;
}

export default function TrendingTags({ universes, onTagClick }: TrendingTagsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {universes.map((universe) => (
        <button
          key={universe.id}
          onClick={() => onTagClick(universe)}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
            bg-slate-800 text-slate-300 border border-slate-700
            hover:bg-indigo-600 hover:text-white hover:border-indigo-500
            hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105 active:scale-95"
        >
          {universe.tag}
        </button>
      ))}
    </div>
  );
}
