'use client';

import { Suspense } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';
import { Loader2 } from 'lucide-react';

export function DashboardClient() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-white"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
      <ChatInterface />
    </Suspense>
  );
}
