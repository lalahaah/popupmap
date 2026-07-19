'use client';

import React from 'react';
import { FilterChips } from '../list/FilterChips';
import { PopupCard } from '../list/PopupCard';
import { Popup } from '@/types/popup';

interface SidebarProps {
  popups: Popup[];
  category: string;
  onCategoryChange: (category: string) => void;
}

export function Sidebar({ popups, category, onCategoryChange }: SidebarProps) {

  const newCount = popups.filter(p => {
    if (!p.startDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(p.startDate);
    start.setHours(0,0,0,0);
    const diffDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 1;
  }).length;

  const closingSoonCount = popups.filter(p => {
    if (!p.endDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(p.endDate);
    end.setHours(0,0,0,0);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  return (
    <aside className="desktop-sidebar w-[400px] h-full border-r-2 border-ink bg-paper flex flex-col z-20">
      {/* Header */}
      <div className="p-5 border-b-2 border-ink">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-tight">POPUP MAP</h1>
            <p className="text-xs font-bold mt-1 text-neutral-500">지금 진짜 열려있는 팝업만</p>
          </div>
          <div className="stub px-3 py-2 text-xs font-mono font-bold">D+0</div>
        </div>

        {/* status banner */}
        <div className="mt-4 border-2 border-ink bg-brandYellow px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold">오늘 새로 오픈</p>
            <p className="font-display text-lg leading-none mt-1">{newCount}곳</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold">이번주 마감임박</p>
            <p className="font-display text-lg leading-none mt-1 text-brandRed">{closingSoonCount}곳</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 border-2 border-ink px-3 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="브랜드 또는 지역 검색" className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-neutral-400" />
        </div>
      </div>

      {/* Category chips */}
      <FilterChips selectedCategory={category} onFilterChange={onCategoryChange} />

      {/* Sort tabs */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b-2 border-ink">
        <div className="flex gap-4 text-sm font-bold">
          <button className="pb-2 border-b-[3px] border-brandRed">마감임박순</button>
          <button className="pb-2 text-neutral-400">신규순</button>
          <button className="pb-2 text-neutral-400">인기순</button>
        </div>
        <span className="text-xs font-mono font-bold text-neutral-500">지도 내 {popups.length}곳</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-4">
        {popups.map(popup => (
          <PopupCard key={popup.id} popup={popup} />
        ))}
      </div>

      {/* CTA */}
      <div className="p-5 border-t-2 border-ink">
        <button className="w-full py-3 bg-brandRed text-white font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all">
          + 팝업 제보하기
        </button>
      </div>
    </aside>
  );
}
