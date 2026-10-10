'use client';

import React, { useState } from 'react';
import AdminPopupForm from '@/components/AdminPopupForm';

function getVerificationBadge(verification?: string) {
  switch (verification) {
    case 'verified':
      return {
        label: '출처 확인됨',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-600',
      };
    case 'name_only':
      return {
        label: '이름만 확인됨 · 날짜는 직접 확인',
        className: 'bg-amber-100 text-amber-800 border-amber-600',
      };
    case 'unreadable':
      return {
        label: '출처 미확인 · 직접 확인 필요',
        className: 'bg-rose-100 text-rose-800 border-rose-600',
      };
    default:
      return null;
  }
}

export default function SubmissionsClient({ initialSubmissions }: { initialSubmissions: any[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        submissions.map(sub => {
          const isAuto = sub.popupData?.autoCollected === true;
          const verificationInfo = isAuto ? getVerificationBadge(sub.popupData?.autoMeta?.verification) : null;
          const sourceUrl = sub.popupData?.sourceUrl;

          return (
            <div key={sub.id} className="bg-white border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)]">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-ink">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-bold text-lg">{sub.popupData.name}</h2>
                    {isAuto && (
                      <span className="px-2 py-0.5 bg-brandBlue text-white text-xs font-bold border border-ink shadow-[1px_1px_0_theme(colors.ink)]">
                        자동수집
                      </span>
                    )}
                    {verificationInfo && (
                      <span className={`px-2 py-0.5 text-xs font-bold border ${verificationInfo.className}`}>
                        {verificationInfo.label}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-neutral-600">{sub.popupData.address}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                    {sub.submitterContact && (
                      <span className="text-neutral-500">제보자: {sub.submitterContact}</span>
                    )}
                    {sourceUrl && (
                      <a 
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-brandBlue underline hover:text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded"
                      >
                        출처 열기 ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-xs text-neutral-500">
                    {new Date(sub.createdAt).toLocaleString()}
                  </div>
                  <button 
                    onClick={() => setEditingId(editingId === sub.id ? null : sub.id)}
                    className="px-4 py-2 bg-brandYellow border-2 border-ink font-bold text-sm shadow-[2px_2px_0_theme(colors.ink)] hover:bg-yellow-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                  >
                    {editingId === sub.id ? '닫기' : '검토하기'}
                  </button>
                </div>
              </div>

              {editingId === sub.id && (
                <EditForm 
                  submission={sub} 
                  onSuccess={() => handleRemove(sub.id)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function EditForm({ submission, onSuccess, onCancel }: { submission: any, onSuccess: () => void, onCancel: () => void }) {
  const isAuto = submission.popupData?.autoCollected === true;

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

        // autoCollected, autoMeta 등 불필요한 메타데이터는 걸러내고 승인에 필요한 필드만 정제하여 전송
        payload.editedData = {
          name: data.name,
          brand: data.brand || undefined,
          description: data.description || undefined,
          category: data.category,
          address: data.address,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          sourceType: data.sourceType || (isAuto ? 'manual' : 'user_submit'),
          sourceUrl: data.sourceUrl,
          images,
          isSponsored: !!data.isSponsored,
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
      throw err;
    }
  };

  const initialData = {
    ...submission.popupData,
    sourceType: isAuto ? 'manual' : (submission.popupData.sourceType || 'user_submit'),
    cardImage: submission.popupData.images?.[0] || '',
    detailImage: submission.popupData.images?.[1] || '',
  };

  return (
    <div className="p-4 bg-neutral-100 border-t-2 border-ink">
      {submission.popupData?.sourceUrl && (
        <div className="mb-4 p-3 bg-blue-50 border-2 border-brandBlue flex items-center justify-between">
          <span className="text-sm font-bold text-neutral-800">
            📌 수집된 출처 URL: <span className="font-normal text-xs text-neutral-600 break-all">{submission.popupData.sourceUrl}</span>
          </span>
          <a
            href={submission.popupData.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-brandBlue text-white text-xs font-bold shrink-0 ml-3 hover:bg-blue-600"
          >
            새 탭에서 출처 열기 ↗
          </a>
        </div>
      )}
      <AdminPopupForm 
        initialData={initialData}
        onSubmit={(data) => handleAction('approve', data)}
        onCancel={onCancel}
        submitLabel="승인 및 팝업 등록"
        extraButtons={
          <button 
            onClick={(e) => {
              e.preventDefault();
              handleAction('reject').catch(err => alert(err.message));
            }}
            className="px-6 py-2 bg-neutral-200 border-2 border-ink font-bold hover:bg-neutral-300 transition-colors mr-auto"
          >
            반려
          </button>
        }
      />
    </div>
  );
}
