import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { useToastContext } from '@librechat/client';
import { useGetSkillFavoritesQuery, useUpdateSkillFavoritesMutation } from '~/data-provider';
import { skillFavoritesAtom } from '~/store';
import { useLocalize } from '~/hooks';
import { logger } from '~/utils';

/** Maximum number of skills a user can favorite (must match backend MAX_SKILL_FAVORITES). */
const MAX_SKILL_FAVORITES = 50;

/**
 * Hook for managing user skill favorites.
 *
 * Skill favorites are a flat array of skill ObjectId strings, persisted via
 * `/api/user/settings/favorites/skills`. Stored separately from the
 * sidebar pin favorites (models/agents) so each can have its own cap.
 */
export default function useSkillFavorites() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [favorites, setFavorites] = useAtom(skillFavoritesAtom);
  const getQuery = useGetSkillFavoritesQuery();
  const updateMutation = useUpdateSkillFavoritesMutation();

  const isMutatingRef = useRef(false);

  useEffect(() => {
    if (isMutatingRef.current || updateMutation.isLoading) {
      return;
    }
    if (Array.isArray(getQuery.data)) {
      setFavorites(getQuery.data);
    }
  }, [getQuery.data, setFavorites, updateMutation.isLoading]);

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { code?: string; limit?: number } };
        };
        const { code, limit } = axiosError.response?.data ?? {};
        if (code === 'MAX_SKILL_FAVORITES_EXCEEDED') {
          return localize('com_ui_max_favorites_reached', {
            0: String(limit ?? MAX_SKILL_FAVORITES),
          });
        }
      }
      return localize('com_ui_error');
    },
    [localize],
  );

  const save = useCallback(
    async (next: string[]) => {
      const deduped = Array.from(new Set(next));
      setFavorites(deduped);
      isMutatingRef.current = true;
      try {
        await updateMutation.mutateAsync(deduped);
      } catch (error) {
        logger.error('Error updating skill favorites:', error);
        showToast({ message: getErrorMessage(error), status: 'error' });
        getQuery.refetch();
      } finally {
        setTimeout(() => {
          isMutatingRef.current = false;
        }, 100);
      }
    },
    [setFavorites, updateMutation, showToast, getErrorMessage, getQuery],
  );

  const isFavorite = useCallback(
    (skillId: string | undefined | null): boolean => {
      if (!skillId) return false;
      return favorites.includes(skillId);
    },
    [favorites],
  );

  const add = useCallback(
    (skillId: string) => {
      if (favorites.includes(skillId)) return;
      save([...favorites, skillId]);
    },
    [favorites, save],
  );

  const remove = useCallback(
    (skillId: string) => {
      save(favorites.filter((id) => id !== skillId));
    },
    [favorites, save],
  );

  const toggle = useCallback(
    (skillId: string) => {
      if (favorites.includes(skillId)) {
        remove(skillId);
      } else {
        add(skillId);
      }
    },
    [favorites, add, remove],
  );

  return {
    favorites,
    isFavorite,
    add,
    remove,
    toggle,
    isLoading: getQuery.isLoading,
    isError: getQuery.isError,
    isUpdating: updateMutation.isLoading,
  };
}
