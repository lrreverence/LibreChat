import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type t from 'librechat-data-provider';

/**
 * Hook for listing skills with optional filtering/pagination params
 */
export const useListSkillsQuery = <TData = t.TSkillListResponse>(
  params: t.TSkillListParams = {},
  config?: UseQueryOptions<t.TSkillListResponse, Error, TData>,
): QueryObserverResult<TData> => {
  return useQuery<t.TSkillListResponse, Error, TData>(
    [QueryKeys.skills, params],
    () => dataService.listSkills(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      ...config,
    },
  );
};

/**
 * Hook for retrieving a single skill by ID
 */
export const useGetSkillByIdQuery = (
  skillId: string | null | undefined,
  config?: UseQueryOptions<t.TSkill>,
): QueryObserverResult<t.TSkill> => {
  return useQuery<t.TSkill>(
    [QueryKeys.skill, skillId],
    () => dataService.getSkillById({ _id: skillId as string }),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      enabled: !!skillId && (config?.enabled ?? true),
      ...config,
    },
  );
};
