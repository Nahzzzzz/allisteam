import { AuthGate } from '@/components/auth-gate';
import { NewPostForm } from '@/components/new-post-form';
import { domainOf } from '@/lib/domain';

interface NewPostPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.domain) ? params.domain[0] : params.domain;
  const rawDestination = Array.isArray(params.destination)
    ? params.destination[0]
    : params.destination;
  const destination = rawDestination?.trim().slice(0, 40);

  // 从「演唱会 / 旅行」的列表点发布进来时，直接停在对应领域；
  // 从徒步攻略点进来时顺带把目的地预填好。
  return (
    <AuthGate>
      <NewPostForm initialDomain={domainOf(raw)} initialDestination={destination} />
    </AuthGate>
  );
}
