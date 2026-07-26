'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/submissions', label: '등록 대기 (Submissions)' },
    { href: '/admin/popups', label: '전체 팝업 관리 (Popups)' },
  ];

  return (
    <div className="bg-ink text-white p-4 flex gap-4 font-bold shadow-md">
      {links.map(link => (
        <Link 
          key={link.href} 
          href={link.href}
          className={`px-4 py-2 rounded ${pathname.startsWith(link.href) ? 'bg-brandBlue text-white' : 'hover:bg-neutral-800'}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
