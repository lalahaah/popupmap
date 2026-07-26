'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AdminPopupForm, { PopupFormData } from '@/components/AdminPopupForm';

const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'FASHION', label: '패션' },
  { id: 'BEAUTY', label: '뷰티' },
  { id: 'FOOD', label: 'F&B' },
  { id: 'GOODS', label: '굿즈' },
  { id: 'EXHIBIT', label: '전시' },
  { id: 'ETC', label: '기타' },
];

export default function PopupsClient({ initialPopups }: { initialPopups: any[] }) {
  const [popups, setPopups] = useState(initialPopups);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchPopups = async (category: string) => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/popups', window.location.origin);
      if (category !== 'ALL') {
        url.searchParams.set('category', category);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setPopups(data.popups);
      }
    } catch (error) {
      console.error('Failed to fetch popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    fetchPopups(cat);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`정말로 '${name}' 팝업을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/popups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPopups(prev => prev.filter(p => p.id !== id));
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete popup:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleUpdate = async (id: string, data: PopupFormData) => {
    try {
      const payload = {
        ...data,
        images: data.images ? data.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      const res = await fetch(`/api/admin/popups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '수정에 실패했습니다.');
      }

      const updated = await res.json();
      setPopups(prev => prev.map(p => (p.id === id ? updated : p)));
      setEditingId(null);
      alert('수정되었습니다.');
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <div>
      {/* Header and Filter */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">전체 팝업 관리</h1>
        <Link 
          href="/admin/new"
          className="px-4 py-2 bg-brandYellow border-2 border-ink font-bold shadow-[2px_2px_0_theme(colors.ink)] hover:bg-yellow-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
        >
          + 새 팝업 등록
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 font-bold border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] whitespace-nowrap transition-colors ${
              activeCategory === cat.id ? 'bg-ink text-white shadow-none translate-x-[2px] translate-y-[2px]' : 'bg-white text-ink hover:bg-neutral-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="p-8 bg-white border-2 border-ink text-center font-bold">로딩 중...</div>
        ) : popups.length === 0 ? (
          <div className="p-8 bg-white border-2 border-ink text-center font-bold">등록된 팝업이 없습니다.</div>
        ) : (
          popups.map(popup => (
            <div key={popup.id} className="bg-white border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)]">
              <div className="p-4 flex items-center justify-between border-b-2 border-ink">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-neutral-200 border-2 border-ink text-[10px] font-bold">
                      {CATEGORIES.find(c => c.id === popup.category)?.label || popup.category}
                    </span>
                    <span className={`px-2 py-0.5 border-2 border-ink text-[10px] font-bold ${
                      popup.status === 'ongoing' ? 'bg-brandRed text-white' : 
                      popup.status === 'ended' ? 'bg-neutral-400 text-white' : 
                      'bg-brandYellow text-ink'
                    }`}>
                      {popup.status === 'ongoing' ? '진행중' : popup.status === 'ended' ? '종료' : '예정'}
                    </span>
                  </div>
                  <h2 className="font-bold text-lg">{popup.name}</h2>
                  <p className="text-sm text-neutral-600 font-mono">
                    {new Date(popup.startDate).toLocaleDateString()} ~ {popup.endDate ? new Date(popup.endDate).toLocaleDateString() : ''}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingId(editingId === popup.id ? null : popup.id)}
                    className="px-3 py-1.5 bg-neutral-100 border-2 border-ink font-bold text-sm hover:bg-neutral-200 transition-colors"
                  >
                    {editingId === popup.id ? '닫기' : '수정'}
                  </button>
                  <button 
                    onClick={() => handleDelete(popup.id, popup.name)}
                    className="px-3 py-1.5 bg-white border-2 border-ink text-brandRed font-bold text-sm hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {editingId === popup.id && (
                <AdminPopupForm 
                  initialData={{
                    ...popup,
                    startDate: new Date(popup.startDate).toISOString().split('T')[0],
                    endDate: popup.endDate ? new Date(popup.endDate).toISOString().split('T')[0] : '',
                    images: popup.images?.join(', ') || '',
                    brand: popup.brand?.name || '', // TODO: DB에 brand가 include 안 되어 있으면 이슈 -> API에서 include 확인 필요
                  }}
                  onSubmit={(data) => handleUpdate(popup.id, data)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="저장하기"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
