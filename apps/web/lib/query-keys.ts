export const queryKeys = {
  posts: (filters: Record<string, string | undefined>) => ['posts', filters] as const,
  myPosts: () => ['my-posts'] as const,
  post: (id: string) => ['post', id] as const,
  games: () => ['games'] as const,
  myGames: () => ['my-games'] as const,
  me: () => ['me'] as const,
};
