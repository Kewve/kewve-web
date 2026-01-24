import * as React from 'react';

import { cn, josefinRegular } from '@/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-black bg-transparent px-3 py-2 text-black text-sm ring-offset-orange file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-black-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        josefinRegular.className,
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
