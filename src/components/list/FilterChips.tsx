'use client';

import React from 'react';

const CATEGORIES = [
  { label: '전체', value: '' },
  { label: '패션', value: 'FASHION' },
  { label: '뷰티', value: 'BEAUTY' },
  { label: 'F&B', value: 'FOOD' },
  { label: '굿즈', value: 'GOODS' },
  { label: '전시', value: 'EXHIBIT' },
];

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
          className={`chip px-3 py-1.5 text-xs ${selectedCategory === cat.value ? 'active' : ''}`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
