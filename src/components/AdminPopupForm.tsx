'use client';

import React, { useState } from 'react';

export interface PopupFormData {
  name: string;
  brand: string;
  description: string;
  category: string;
  address: string;
  startDate: string;
  endDate: string;
  sourceType: string;
  sourceUrl: string;
  cardImage: string;
  detailImage: string;
  isSponsored: boolean;
}

interface AdminPopupFormProps {
  initialData?: Partial<PopupFormData>;
  onSubmit: (data: PopupFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  extraButtons?: React.ReactNode;
}

export default function AdminPopupForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = '저장',
  extraButtons 
}: AdminPopupFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingDetail, setUploadingDetail] = useState(false);
  
  const [formData, setFormData] = useState<PopupFormData>({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    description: initialData?.description || '',
    category: initialData?.category || 'ETC',
    address: initialData?.address || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    sourceType: initialData?.sourceType || 'manual',
    sourceUrl: initialData?.sourceUrl || '',
    cardImage: initialData?.cardImage || '',
    detailImage: initialData?.detailImage || '',
    isSponsored: initialData?.isSponsored || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'cardImage' | 'detailImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fieldName === 'cardImage') setUploadingCard(true);
    else setUploadingDetail(true);

    const uploadForm = new FormData();
    uploadForm.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadForm,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setFormData(prev => ({ ...prev, [fieldName]: data.url }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      if (fieldName === 'cardImage') setUploadingCard(false);
      else setUploadingDetail(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-neutral-50 flex flex-col gap-4 border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)]">
      {errorMsg && (
        <div className="p-3 bg-brandRed text-white text-sm font-bold border-2 border-ink">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1">팝업 이름 *</label>
          <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" required />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">브랜드</label>
          <input name="brand" value={formData.brand} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">상세 주소 *</label>
          <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm" required />
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
          <label className="block text-xs font-bold mb-1">시작일 *</label>
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm font-mono" required />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">종료일 *</label>
          <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full p-2 border-2 border-ink text-sm font-mono" required />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">원문 링크</label>
          <input name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} placeholder="http://..." className="w-full p-2 border-2 border-ink text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">카드 이미지 (정사각형 권장, 400×400px, 500KB 이하)</label>
          <div className="flex gap-2">
            <input name="cardImage" value={formData.cardImage} onChange={handleChange} placeholder="http://..." className="flex-1 p-2 border-2 border-ink text-sm" />
            <label className="cursor-pointer bg-neutral-200 border-2 border-ink px-4 py-2 text-sm font-bold flex items-center hover:bg-neutral-300 transition-colors shrink-0">
              {uploadingCard ? '업로드 중...' : '파일 업로드'}
              <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'cardImage')} disabled={uploadingCard} />
            </label>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold mb-1">상세페이지 이미지 (가로형 권장, 800×500px, 500KB 이하)</label>
          <div className="flex gap-2">
            <input name="detailImage" value={formData.detailImage} onChange={handleChange} placeholder="http://..." className="flex-1 p-2 border-2 border-ink text-sm" />
            <label className="cursor-pointer bg-neutral-200 border-2 border-ink px-4 py-2 text-sm font-bold flex items-center hover:bg-neutral-300 transition-colors shrink-0">
              {uploadingDetail ? '업로드 중...' : '파일 업로드'}
              <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'detailImage')} disabled={uploadingDetail} />
            </label>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-2 mt-2">
          <input type="checkbox" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} id="sponsor" className="w-4 h-4" />
          <label htmlFor="sponsor" className="text-sm font-bold">스폰서(광고) 여부</label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t-2 border-ink">
        {extraButtons}
        {onCancel && (
          <button 
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 bg-neutral-200 border-2 border-ink font-bold hover:bg-neutral-300 transition-colors"
          >
            취소
          </button>
        )}
        <button 
          onClick={handleSubmit}
          disabled={loading || !formData.name || !formData.address || !formData.startDate || !formData.endDate}
          className="px-6 py-2 bg-brandBlue text-white border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] font-bold active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50"
        >
          {loading ? '처리중...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
