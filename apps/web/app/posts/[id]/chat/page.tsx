import { PostChat } from '@/components/post-chat';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  return <PostChat postId={id} />;
}
