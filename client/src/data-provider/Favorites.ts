import { dataService } from 'librechat-data-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { FavoritesState } from '~/store/favorites';

const SKILL_FAVORITES_KEY = ['favorites', 'skills'];

export const useGetFavoritesQuery = (
  config?: Omit<UseQueryOptions<FavoritesState, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<FavoritesState, Error>(
    ['favorites'],
    () => dataService.getFavorites() as Promise<FavoritesState>,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useUpdateFavoritesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (favorites: FavoritesState) =>
      dataService.updateFavorites(favorites) as Promise<FavoritesState>,
    {
      // Optimistic update to prevent UI flickering when toggling favorites
      // Sets query cache immediately before the request completes
      onMutate: async (newFavorites) => {
        await queryClient.cancelQueries(['favorites']);

        const previousFavorites = queryClient.getQueryData<FavoritesState>(['favorites']);
        queryClient.setQueryData(['favorites'], newFavorites);

        return { previousFavorites };
      },
      onError: (_err, _newFavorites, context) => {
        if (context?.previousFavorites) {
          queryClient.setQueryData(['favorites'], context.previousFavorites);
        }
      },
    },
  );
};

export const useGetSkillFavoritesQuery = (
  config?: Omit<UseQueryOptions<string[], Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<string[], Error>(
    SKILL_FAVORITES_KEY,
    () => dataService.getSkillFavorites() as Promise<string[]>,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useUpdateSkillFavoritesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (skillFavorites: string[]) =>
      dataService.updateSkillFavorites(skillFavorites) as Promise<string[]>,
    {
      onMutate: async (newFavorites) => {
        await queryClient.cancelQueries(SKILL_FAVORITES_KEY);
        const previous = queryClient.getQueryData<string[]>(SKILL_FAVORITES_KEY);
        queryClient.setQueryData(SKILL_FAVORITES_KEY, newFavorites);
        return { previous };
      },
      onError: (_err, _newFavorites, context) => {
        if (context?.previous) {
          queryClient.setQueryData(SKILL_FAVORITES_KEY, context.previous);
        }
      },
    },
  );
};
