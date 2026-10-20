import { z } from 'zod';
import { platformSchema } from '../enums';

export const gameProfileInputSchema = z
  .object({
    gameId: z.string().min(1),
    platform: platformSchema,
    rankText: z.string().trim().max(30).optional(),
    voiceOk: z.boolean().optional(),
  })
  .strict();

export type GameProfileInput = z.infer<typeof gameProfileInputSchema>;

export interface GameProfileView {
  id: string;
  gameId: string;
  gameName: string;
  platform: string;
  rankText: string | null;
  voiceOk: boolean;
}

export interface GameView {
  id: string;
  name: string;
  coverUrl: string | null;
}
