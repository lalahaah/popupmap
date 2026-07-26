'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminPopupForm, { PopupFormData } from '@/components/AdminPopupForm';

export default function AdminNewPopupPage() {
  const router = useRouter();

  const handleSubmit = async (data: PopupFormData) => {
    const payload = {
      ...data,
      images: data.images ? data.images.split(',').map(s => s.trim()).filter(Boolean) : [],
    };

    const res = await fetch('/api/popups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || '팝업 등록 중 오류가 발생했습니다.');
    }

    alert('팝업이 등록되었습니다.');
    router.push('/admin/submissions'); // 등록 후 제보 관리 목록으로 이동
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold font-display mb-6 uppercase">신규 팝업 직접 등록</h1>
      <AdminPopupForm 
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="팝업 등록"
      />
    </div>
  );
}
