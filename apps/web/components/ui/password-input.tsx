'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/icons';
import { inputClass } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** 带显隐切换的密码框，按钮占满 44px 高度，移动端好点 */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={cn(inputClass, 'pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? '隐藏密码' : '显示密码'}
        aria-pressed={visible}
        className="absolute right-0 top-0 grid size-11 place-items-center rounded-xl text-ink-faint transition-colors hover:text-ink"
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
