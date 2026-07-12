'use client'

import React, { useEffect, useState } from 'react'
import { AppShell } from './app-shell'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Database, Settings, LogOut, ShieldAlert, Plus, MoreVertical } from 'lucide-react'
import { FlowLogo } from '@/components/flow-logo'

export function GlobalAppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  
  const [pastIntents, setPastIntents] = useState<{id: string, title: string}[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/intents/history')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setPastIntents(data)
        })
        .catch(console.error)
    }
  }, [status, pathname])
  
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading Flow...</div>
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return <>{children}</>
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-4">
        <Link href="/refine" className="flex items-center gap-2 mb-6 px-2">
           <FlowLogo size="md" />
        </Link>
        <button 
          onClick={() => router.push('/refine')}
          className="flex items-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-lg p-3 text-sm font-medium text-white transition-colors">
          <Plus className="w-4 h-4" />
          New Intent
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</h3>
        <div className="space-y-1">
          {pastIntents.map(intent => (
            <Link href={`/refine?id=${intent.id}`} key={intent.id} className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-slate-200 text-sm text-gray-700 transition-colors">
              <span className="truncate">{intent.title}</span>
            </Link>
          ))}
          {pastIntents.length === 0 && (
            <p className="text-xs text-gray-400 italic px-2">No history</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 relative">
         {/* Popup Menu */}
         {isMenuOpen && (
           <div className="absolute bottom-full left-4 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
             <Link href="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm text-gray-700">
               <Settings className="w-4 h-4" /> Knowledge Graph
             </Link>
             <Link href="/registry" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm text-gray-700">
               <Database className="w-4 h-4" /> Intent Registry
             </Link>
             {session?.user?.role === 'ADMIN' && (
               <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm text-gray-700">
                 <ShieldAlert className="w-4 h-4" /> Admin Panel
               </Link>
             )}
             <div className="border-t my-1"></div>
             <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm text-red-600">
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
           </div>
         )}
         
         <button 
           onClick={() => setIsMenuOpen(!isMenuOpen)}
           className="flex items-center justify-between w-full p-2 rounded-md hover:bg-slate-200 transition-colors"
         >
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                 {session?.user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col text-left">
                 <span className="text-sm font-medium text-gray-900 leading-tight">{session?.user?.name || 'User'}</span>
                 <span className="text-xs text-gray-500">{session?.user?.role}</span>
              </div>
           </div>
           <MoreVertical className="w-4 h-4 text-gray-400" />
         </button>
      </div>
    </div>
  )

  return (
    <AppShell sidebar={sidebar}>
      {children}
    </AppShell>
  )
}
