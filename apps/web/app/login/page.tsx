'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@allisteam/shared';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      toast.success('登录成功');
      router.push('/me');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败');
    }
  });

  return (
    <AuthShell
      title="欢迎回来"
      description="登录后就能发局、报名，并进入局内聊天。"
      footer={
        <>
          还没有账号？
          <Link
            href="/register"
            className="ml-1 font-medium text-accent underline underline-offset-4"
          >
            去注册
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="mt-1 text-xs text-danger">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="password">密码</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="输入密码"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-xs text-danger">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="block" className="mt-1" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '登录中…' : '登录'}
        </Button>
      </form>
    </AuthShell>
  );
}
