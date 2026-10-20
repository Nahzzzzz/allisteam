export const queryKeys = {
  posts: (filters: Record<string, string | undefined>) => ['posts', filters] as const,
  myPosts: () => ['my-posts'] as const,
  myApplications: () => ['my-applications'] as const,
  post: (id: string) => ['post', id] as const,
  applications: (postId: string, status?: string) =>
    ['applications', postId, status ?? 'ALL'] as const,
  messages: (postId: string) => ['messages', postId] as const,
  games: () => ['games'] as const,
  myGames: () => ['my-games'] as const,
  me: () => ['me'] as const,
  postReviews: (postId: string) => ['post-reviews', postId] as const,
  userProfile: (userId: string) => ['user-profile', userId] as const,
  userReviews: (userId: string) => ['user-reviews', userId] as const,
  adminReports: (status: string) => ['admin-reports', status] as const,
};
