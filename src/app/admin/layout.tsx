import React from 'react';
import AdminNav from '@/components/AdminNav';
import { auth } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div>
      {session?.user && <AdminNav />}
      {children}
    </div>
  );
}
