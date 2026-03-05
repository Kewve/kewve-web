'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AuthAwareLinkProps {
  hrefGuest: string;
  hrefAuth: string;
  children: React.ReactNode;
  className?: string;
}

export default function AuthAwareLink({ hrefGuest, hrefAuth, children, className }: AuthAwareLinkProps) {
  const { isAuthenticated, loading } = useAuth();

  const href = !loading && isAuthenticated ? hrefAuth : hrefGuest;

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
