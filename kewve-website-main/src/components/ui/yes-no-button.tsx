'use client';

import * as React from 'react';
import { cn } from '@/utils';

interface YesNoButtonProps {
  value: 'yes' | 'no' | '';
  onValueChange: (value: 'yes' | 'no') => void;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
}

export function YesNoButton({ value, onValueChange, yesLabel = 'Yes', noLabel = 'No', className }: YesNoButtonProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      <button
        type='button'
        onClick={() => onValueChange('yes')}
        className={cn(
          'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
          value === 'yes'
            ? 'bg-[#153b2e] text-white'
            : 'bg-gray-100 text-black-muted hover:bg-gray-200'
        )}>
        {yesLabel}
      </button>
      <button
        type='button'
        onClick={() => onValueChange('no')}
        className={cn(
          'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
          value === 'no'
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 text-black-muted hover:bg-gray-200'
        )}>
        {noLabel}
      </button>
    </div>
  );
}
