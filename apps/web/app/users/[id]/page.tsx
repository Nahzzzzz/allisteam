import { UserProfileView } from '@/components/user-profile';

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  return <UserProfileView userId={id} />;
}
