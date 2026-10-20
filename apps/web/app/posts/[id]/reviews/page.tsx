import { PostReviews } from '@/components/post-reviews';

interface PostReviewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostReviewsPage({ params }: PostReviewsPageProps) {
  const { id } = await params;
  return <PostReviews postId={id} />;
}
