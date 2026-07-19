'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmissionsClient({ initialSubmissions }: { initialSubmissions: any[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const handleRemove = (id: string) => {
    setSubmissions(prev => prev.filter(sub => sub.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      {submissions.length === 0 ? (
        <div className="p-8 bg-white border-2 border-ink text-center font-bold">
          대기 중인 제보가 없습니다.
        </div>
      ) : (
        submissions.map(sub => (
          <div key={sub.id} className="bg-white border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)]">
            <div className="p-4 flex items-center justify-between border-b-2 border-ink">
              <div>
                <h2 className="font-bold text-lg">{sub.popupData.name}</h2>
                <p className="text-sm text-neutral-600">{sub.popupData.address}</p>
                {sub.submitterContact && (
                  <p className="text-xs text-neutral-400 mt-1">제보자: {sub.submitterContact}</p>
                )}
              </div>
              <div className="text-xs text-neutral-500">
                {new Date(sub.createdAt).toLocaleString()}
              </div>
              <button 
                onClick={() => setEditingId(editingId === sub.id ? null : sub.id)}
                className="px-4 py-2 bg-brandYellow border-2 border-ink font-bold text-sm"
              >
                {editingId === sub.id ? '닫기' : '검토하기'}
              </button>
            </div>

            {editingId === sub.id && (
              <EditForm 
                submission={sub} 
                onSuccess={() => handleRemove(sub.id)}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function EditForm({ submission, onSuccess, onCancel }: { submission: any, onSuccess: () => void, onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const initialData = submission.popupData;
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    brand: '',
    description: '',
    category: initialData.category || 'ETC',
    address: initialData.address || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    sourceType: 'user_submit',
    sourceUrl: '',
    images: '', // 쉼표 구분
    isSponsored: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true);
    setErrorMsg('');

    try {
      let payload: any = { action };
      if (action === 'approve') {
        if (!formData.sourceUrl) {
          throw new Error('승인 시 원문 링크(sourceUrl)는 필수입니다.');
        }
        payload.editedData = {
          ...formData,
          images: formData.images.split(',').map(s => s.trim()).filter(Boolean),
        };
      }

      const res = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '처리 중 오류가 발생했습니다.');
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-neutral-50 flex flex-col gap-4">
      {errorMsg && (
        <div className="p-3 bg-brandRed text-white text-sm font-bold border-2 border-ink">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1">팝업 이름</label>
          <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">브랜드</label>
          <input name="brand" value={formData.brand} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">상세 주소</label>
          <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">설명</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm h-20" />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">카테고리</label>
          <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm">
            <option value="FASHION">패션</option>
            <option value="BEAUTY">뷰티</option>
            <option value="FOOD">F&B</option>
            <option value="GOODS">굿즈</option>
            <option value="EXHIBIT">전시</option>
            <option value="ETC">기타</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">제보 출처</label>
          <select name="sourceType" value={formData.sourceType} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm">
            <option value="user_submit">유저 제보</option>
            <option value="manual">수기 입력</option>
            <option value="brand_official">브랜드 공식</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">시작일</label>
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">종료일</label>
          <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm font-mono" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">원문 링크 <span className="text-brandRed">*</span></label>
          <input name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} placeholder="http://..." className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">이미지 URL (쉼표 구분)</label>
          <input name="images" value={formData.images} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div className="col-span-2 flex items-center gap-2 mt-2">
          <input type="checkbox" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} id="sponsor" className="w-4 h-4" />
          <label htmlFor="sponsor" className="text-sm font-bold">스폰서(광고) 여부</label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t-2 border-ink">
        <button 
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="px-6 py-2 bg-neutral-200 border-2 border-ink font-bold hover:bg-neutral-300 transition-colors"
        >
          반려
        </button>
        <button 
          onClick={() => handleAction('approve')}
          disabled={loading || !formData.sourceUrl}
          className="px-6 py-2 bg-brandBlue text-white border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] font-bold active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50"
        >
          승인 및 팝업 등록
        </button>
      </div>
    </div>
  );
}
