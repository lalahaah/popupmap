'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPopupForm from '@/components/AdminPopupForm';

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
  const handleAction = async (action: 'approve' | 'reject', data?: any) => {
    try {
      let payload: any = { action };
      if (action === 'approve') {
        if (!data?.sourceUrl) {
          throw new Error('승인 시 원문 링크(sourceUrl)는 필수입니다.');
        }
        const cImg = data.cardImage?.trim() || '';
        const dImg = data.detailImage?.trim() || '';
        const images = (cImg || dImg) ? [cImg || dImg, dImg || cImg] : [];

        payload.editedData = {
          ...data,
          images,
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
      throw err; // AdminPopupForm에서 잡아서 errorMsg로 보여줌
    }
  };

  const initialData = {
    ...submission.popupData,
    sourceType: 'user_submit',
    cardImage: submission.popupData.images?.[0] || '',
    detailImage: submission.popupData.images?.[1] || '',
  };

  return (
    <AdminPopupForm 
      initialData={initialData}
      onSubmit={(data) => handleAction('approve', data)}
      onCancel={onCancel}
      submitLabel="승인 및 팝업 등록"
      extraButtons={
        <button 
          onClick={(e) => {
            e.preventDefault();
            // 반려 액션은 폼 검증과 무관하게 실행되도록 별도 처리
            handleAction('reject').catch(err => alert(err.message));
          }}
          className="px-6 py-2 bg-neutral-200 border-2 border-ink font-bold hover:bg-neutral-300 transition-colors mr-auto"
        >
          반려
        </button>
      }
    />
  );
}
