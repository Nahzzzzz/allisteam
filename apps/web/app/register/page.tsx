'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '@allisteam/shared';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { register as registerAccount } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', nickname: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerAccount(values.email, values.password, values.nickname);
      toast.success('注册成功，先补充一下游戏档案吧');
      router.push('/me');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '注册失败');
    }
  });

  return (
    <AuthShell
      title="创建账号"
      description="填三个空，就能开始找今晚的队友。"
      footer={
        <>
          已有账号？
          <Link href="/login" className="ml-1 font-medium text-accent underline underline-offset-4">
            去登录
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="nickname">昵称</Label>
          <Input
            id="nickname"
            autoComplete="nickname"
            placeholder="别人看到的名字"
            aria-invalid={Boolean(form.formState.errors.nickname)}
            {...form.register('nickname')}
          />
          {form.formState.errors.nickname ? (
            <p className="mt-1 text-xs text-danger">{form.formState.errors.nickname.message}</p>
          ) : null}
        </div>

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
            autoComplete="new-password"
            placeholder="设置密码"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-xs text-danger">{form.formState.errors.password.message}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-faint">至少 8 位，需同时包含字母和数字。</p>
          )}
        </div>

        <Button type="submit" size="block" className="mt-1" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '注册中…' : '注册'}
        </Button>
      </form>
    </AuthShell>
  );
}
