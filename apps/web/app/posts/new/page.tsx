import { AuthGate } from '@/components/auth-gate';
import { NewPostForm } from '@/components/new-post-form';
import { domainOf } from '@/lib/domain';

interface NewPostPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.domain) ? params.domain[0] : params.domain;

  // 从「演唱会 / 旅行」的列表点发布进来时，直接停在对应领域
  return (
    <AuthGate>
      <NewPostForm initialDomain={domainOf(raw)} />
    </AuthGate>
  );
}
