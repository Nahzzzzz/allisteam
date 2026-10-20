'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '@allisteam/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <main className="px-4 pt-10">
      <h1 className="text-xl font-semibold">注册</h1>
      <p className="mt-1 text-xs text-neutral-500">密码至少 8 位，需同时包含字母和数字。</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <Label htmlFor="nickname">昵称</Label>
          <Input id="nickname" autoComplete="nickname" {...form.register('nickname')} />
          {form.formState.errors.nickname ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.nickname.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="block" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '注册中…' : '注册'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-500">
        已有账号？
        <Link href="/login" className="ml-1 font-medium text-neutral-900 underline">
          去登录
        </Link>
      </p>
    </main>
  );
}
