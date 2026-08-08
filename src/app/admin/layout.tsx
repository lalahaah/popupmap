import React from 'react';
import AdminNav from '@/components/AdminNav';
import { auth } from '@/lib/auth';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="min-h-screen flex flex-col">
      {session?.user && <AdminNav />}
      <div className="flex-1">
        {children}
      </div>
      <footer className="py-6 border-t-2 border-ink text-center text-xs text-neutral-500 font-sans bg-paper">
        <p>© 2026 주식회사 루시퍼 · hello@popupmap.app</p>
        <p className="mt-2">
          <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">이용약관</Link>
        </p>
      </footer>
    </div>
  );
}
