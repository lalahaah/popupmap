'use client';

import React, { useState, useEffect } from 'react';
import { Popup } from '@/types/popup';

interface Review {
  id: string;
  nickname: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface PopupDetailProps {
  popup: Popup;
  onClose: () => void;
  onShowOnMap?: () => void;
}

export function PopupDetail({ popup, onClose, onShowOnMap }: PopupDetailProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReview, setNewReview] = useState({ nickname: '', rating: 5, comment: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/popups/${popup.id}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(err => console.error(err));
  }, [popup.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/popups/${popup.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews([data, ...reviews]);
        setNewReview({ nickname: '', rating: 5, comment: '' });
        setIsFormOpen(false);
      } else {
        const errorData = await res.json();
        alert(errorData.error || '리뷰 작성에 실패했습니다.');
      }
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dDayText = '';
  let isClosingSoon = false;
  let isNew = false;

  if (popup.endDate) {
    const end = new Date(popup.endDate);
    end.setHours(0, 0, 0, 0);
    const diffTimeEnd = end.getTime() - today.getTime();
    const diffDaysEnd = Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24));

    if (diffDaysEnd <= 3 && diffDaysEnd >= 0) {
      isClosingSoon = true;
      dDayText = `D-${diffDaysEnd === 0 ? 'DAY' : diffDaysEnd}`;
    } else if (diffDaysEnd < 0) {
      dDayText = 'END';
    } else {
      dDayText = `D-${diffDaysEnd}`;
    }
  }

  if (popup.startDate) {
    const start = new Date(popup.startDate);
    start.setHours(0, 0, 0, 0);
    const diffTimeStart = today.getTime() - start.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));
    
    if (diffDaysStart >= 0 && diffDaysStart <= 1) {
      isNew = true;
      dDayText = 'NEW';
    }
  }

  if (!dDayText) dDayText = 'D-?';

  const categoryLabels: Record<string, string> = {
    'FASHION': '패션',
    'BEAUTY': '뷰티',
    'FOOD': 'F&B',
    'GOODS': '굿즈',
    'EXHIBIT': '전시',
    'ETC': '기타',
  };

  const formatMonthDay = (date?: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const dateRange = popup.startDate && popup.endDate 
    ? `${formatMonthDay(popup.startDate)} – ${formatMonthDay(popup.endDate)}`
    : popup.endDate 
      ? `~ ${formatMonthDay(popup.endDate)}` 
      : '상시운영';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[440px] max-w-full bg-paper border-l-2 border-ink z-50 overflow-y-auto flex flex-col shadow-[-4px_0_0_theme(colors.ink)]">
        {/* Header Image */}
        <div className="relative w-full h-[250px] bg-neutral-200 border-b-2 border-ink shrink-0">
          {popup.images && popup.images.length > 0 ? (
            <img src={popup.images[1] || popup.images[0]} alt={popup.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brandBlue to-brandRed"></div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-card border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[4px_4px_0_theme(colors.ink)] transition-all z-10"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div className={`absolute -bottom-3 left-6 stub px-3 py-1.5 text-xs font-mono font-bold border-2 border-ink ${isNew ? 'bg-brandRed !text-white' : ''}`}>
            {dDayText}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-12 flex-1 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 border-2 border-ink bg-brandYellow">
                {categoryLabels[popup.category] || '기타'}
              </span>
              {isClosingSoon && (
                <span className="text-xs font-bold text-brandRed">마감임박</span>
              )}
            </div>
            <h2 className="font-display text-3xl tracking-tight leading-none mb-3">{popup.name}</h2>
            
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-neutral-600">{popup.address || '주소 정보 없음'}</p>
              {onShowOnMap && (
                <button 
                  onClick={onShowOnMap}
                  className="flex items-center gap-1 shrink-0 px-2 py-1 bg-paper border-2 border-ink text-xs font-bold shadow-[2px_2px_0_theme(colors.ink)] active:translate-x-px active:translate-y-px active:shadow-none"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  지도에서 보기
                </button>
              )}
            </div>
            
            <p className="text-sm font-mono font-bold mt-1 text-brandBlue">{dateRange}</p>
          </div>

          {popup.description && (
            <div className="border-t-2 border-ink pt-6">
              <h3 className="font-bold mb-3 text-sm">상세 정보</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{popup.description}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {popup.sourceUrl && (
          <div className="p-6 border-t-2 border-ink bg-card">
            <a 
              href={popup.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 bg-brandBlue text-white text-center font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all"
            >
              원문 보기 ↗
            </a>
          </div>
        )}

        {/* Reviews Section */}
        <div className="p-6 border-t-2 border-ink bg-paper">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">리뷰 {reviews.length > 0 && <span className="text-brandBlue">({reviews.length})</span>}</h3>
              {reviews.length > 0 && (
                <div className="text-sm font-bold flex items-center gap-1">
                  <span className="text-brandYellow">★</span> {avgRating}
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-3 py-1 text-xs font-bold bg-white border-2 border-brandBlue text-brandBlue hover:bg-brandBlue hover:text-white transition-colors"
            >
              {isFormOpen ? '취소' : '리뷰 쓰기'}
            </button>
          </div>

          {isFormOpen && (
            <form onSubmit={handleReviewSubmit} className="mb-6 flex flex-col gap-3 border-2 border-ink p-4 bg-card shadow-[4px_4px_0_theme(colors.ink)]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold w-12 shrink-0">별점</span>
                  <div className="flex items-center gap-1 cursor-pointer flex-wrap">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span 
                        key={star} 
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className={`text-2xl leading-none select-none ${star <= newReview.rating ? 'text-brandYellow' : 'text-neutral-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold w-12 shrink-0">닉네임</span>
                  <input 
                    type="text" 
                    placeholder="최대 20자" 
                    maxLength={20}
                    required
                    className="flex-1 min-w-0 p-2 text-sm border-2 border-ink outline-none focus:bg-yellow-50 font-bold bg-transparent"
                    value={newReview.nickname}
                    onChange={e => setNewReview({ ...newReview, nickname: e.target.value })}
                  />
                </div>
              </div>

              <textarea 
                placeholder="리뷰를 작성해주세요 (최대 300자)" 
                maxLength={300}
                required
                rows={3}
                className="w-full mt-2 p-2 text-sm border-2 border-ink outline-none focus:bg-yellow-50 resize-none bg-transparent"
                value={newReview.comment}
                onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2 bg-ink text-white font-bold border-2 border-ink hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? '등록 중...' : '리뷰 등록'}
              </button>
              <p className="text-[10px] text-neutral-500 text-center leading-tight">
                리뷰는 승인 없이 바로 게시됩니다.<br/>부적절한 리뷰는 관리자에 의해 삭제될 수 있습니다.
              </p>
            </form>
          )}

          <div className="flex flex-col gap-4">
            {reviews.map(review => (
              <div key={review.id} className="border-b-2 border-ink pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{review.nickname}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-brandYellow text-xs">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">첫 리뷰를 남겨주세요!</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
