'use client';

import React, { useState } from 'react';

interface SubmissionFormProps {
  onClose: () => void;
}

export function SubmissionForm({ onClose }: SubmissionFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      category: formData.get('category') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string || null,
      submitterContact: formData.get('submitterContact') as string || null,
    };

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '제보 등록에 실패했습니다.');
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-full bg-paper border-l-2 border-ink z-50 overflow-y-auto flex flex-col shadow-[-4px_0_0_theme(colors.ink)]">
        <div className="p-5 border-b-2 border-ink flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-2xl tracking-tight">제보하기</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-card border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[4px_4px_0_theme(colors.ink)] transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 flex-1">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-brandYellow border-2 border-ink flex items-center justify-center rounded-full mb-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3 className="font-display text-2xl">THANK YOU!</h3>
              <p className="text-sm font-bold text-neutral-600 leading-relaxed">
                소중한 제보 감사합니다.<br />
                검토 후 지도에 반영될 예정입니다.
              </p>
              <button 
                onClick={onClose}
                className="mt-6 px-8 py-3 bg-brandRed text-white font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all"
              >
                닫기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMsg && (
                <div className="p-3 bg-brandRed text-white text-sm font-bold border-2 border-ink">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-1.5">팝업 이름 <span className="text-brandRed">*</span></label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  className="w-full p-3 bg-white border-2 border-ink focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-brandBlue text-sm font-medium"
                  placeholder="예: 탬버린즈 성수 플래그십"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5">상세 주소 <span className="text-brandRed">*</span></label>
                <input 
                  type="text" 
                  name="address" 
                  required 
                  className="w-full p-3 bg-white border-2 border-ink focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-brandBlue text-sm font-medium"
                  placeholder="예: 서울 성동구 연무장5길 8"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5">카테고리 <span className="text-brandRed">*</span></label>
                <select 
                  name="category" 
                  required 
                  className="w-full p-3 bg-white border-2 border-ink focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-brandBlue text-sm font-bold appearance-none cursor-pointer"
                >
                  <option value="ETC">카테고리 선택</option>
                  <option value="FASHION">패션</option>
                  <option value="BEAUTY">뷰티</option>
                  <option value="FOOD">F&B</option>
                  <option value="GOODS">굿즈</option>
                  <option value="EXHIBIT">전시</option>
                  <option value="ETC">기타</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5">시작일 <span className="text-brandRed">*</span></label>
                  <input 
                    type="date" 
                    name="startDate" 
                    required 
                    className="w-full p-3 bg-white border-2 border-ink focus:outline-none focus:ring-2 focus:ring-brandBlue text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">종료일</label>
                  <input 
                    type="date" 
                    name="endDate" 
                    className="w-full p-3 bg-white border-2 border-ink focus:outline-none focus:ring-2 focus:ring-brandBlue text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5">제보자 연락처 (선택)</label>
                <input 
                  type="text" 
                  name="submitterContact" 
                  className="w-full p-3 bg-white border-2 border-ink focus:outline-none focus:ring-2 focus:ring-brandBlue text-sm font-medium"
                  placeholder="이메일 또는 인스타그램 ID"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 py-4 bg-brandBlue text-white font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0_theme(colors.ink)]"
              >
                {loading ? '제출 중...' : '제보하기'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
