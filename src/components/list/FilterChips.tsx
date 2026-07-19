'use client';

import React from 'react';

import { CATEGORIES } from '@/lib/constants';

interface FilterChipsProps {
  selectedCategory: string;
  onFilterChange: (category: string) => void;
}

export function FilterChips({ selectedCategory, onFilterChange }: FilterChipsProps) {
  return (
    <div className="px-5 pt-3 flex gap-2 flex-wrap">
      {CATEGORIES.map(cat => (
        <button
          key={cat.label}
          onClick={() => onFilterChange(cat.value)}
          className={`chip px-3 py-1.5 text-xs font-bold border-2 border-ink ${selectedCategory === cat.value ? 'bg-ink text-paper' : 'bg-white text-ink'}`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
