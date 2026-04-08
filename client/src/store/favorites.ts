import { createTabIsolatedAtom } from './jotai-utils';

export type Favorite = {
  agentId?: string;
  model?: string;
  endpoint?: string;
};

export type FavoriteModel = {
  model: string;
  endpoint: string;
};

export type FavoritesState = Favorite[];

/**
 * This atom stores the user's favorite models/agents (max 15, sidebar pins).
 */
export const favoritesAtom = createTabIsolatedAtom<FavoritesState>('favorites', []);
