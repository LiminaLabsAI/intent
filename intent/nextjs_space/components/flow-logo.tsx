'use client';

import { cn } from '@/lib/utils';

interface FlowLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 'w-6 h-6', text: 'text-sm', inner: 'w-2.5 h-2.5' },
  md: { icon: 'w-8 h-8', text: 'text-lg', inner: 'w-3 h-3' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl', inner: 'w-4 h-4' },
  xl: { icon: 'w-16 h-16', text: 'text-3xl', inner: 'w-6 h-6' },
};

export function FlowLogo({ size = 'md', showText = true, className }: FlowLogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn(
        s.icon,
        'rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20'
      )}>
        <svg viewBox="0 0 24 24" fill="none" className={s.inner}>
          <path
            d="M4 6C4 6 8 4 12 8C16 12 20 10 20 10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M4 14C4 14 8 12 12 16C16 20 20 18 20 18"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn(s.text, 'font-display font-bold text-gray-900 tracking-tight')}>Flow</span>
      )}
    </div>
  );
}

export function FlowIcon({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/15',
      className
    )}>
      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
        <path
          d="M4 6C4 6 8 4 12 8C16 12 20 10 20 10"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M4 14C4 14 8 12 12 16C16 20 20 18 20 18"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
