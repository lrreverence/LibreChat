import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, QueryKeys } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type * as t from 'librechat-data-provider';

/**
 * Hook for creating a skill
 */
export const useCreateSkillMutation = (
  options?: t.CreateSkillOptions,
): UseMutationResult<t.TSkill, Error, t.CreateSkillBody> => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: t.CreateSkillBody) => dataService.createSkill(data),
    {
      onMutate: (variables) => options?.onMutate?.(variables),
      onError: (error, variables, context) => options?.onError?.(error, variables, context),
      onSuccess: (newSkill, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.skills]);
        return options?.onSuccess?.(newSkill, variables, context);
      },
    },
  );
};

/**
 * Hook for updating a skill
 */
export const useUpdateSkillMutation = (
  options?: t.UpdateSkillOptions,
): UseMutationResult<t.TSkill, Error, t.UpdateSkillVariables> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ _id, data }: t.UpdateSkillVariables) => dataService.updateSkill({ _id, data }),
    {
      onMutate: (variables) => options?.onMutate?.(variables),
      onError: (error, variables, context) => options?.onError?.(error, variables, context),
      onSuccess: (updatedSkill, variables, context) => {
        queryClient.setQueryData<t.TSkill>([QueryKeys.skill, variables._id], updatedSkill);
        queryClient.invalidateQueries([QueryKeys.skills]);
        return options?.onSuccess?.(updatedSkill, variables, context);
      },
    },
  );
};

/**
 * Hook for deleting a skill
 */
export const useDeleteSkillMutation = (
  options?: t.DeleteSkillOptions,
): UseMutationResult<void, Error, t.DeleteSkillBody> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ _id }: t.DeleteSkillBody) => dataService.deleteSkill({ _id }),
    {
      onMutate: (variables) => options?.onMutate?.(variables),
      onError: (error, variables, context) => options?.onError?.(error, variables, context),
      onSuccess: (_data, variables, context) => {
        queryClient.removeQueries([QueryKeys.skill, variables._id]);
        queryClient.invalidateQueries([QueryKeys.skills]);
        return options?.onSuccess?.(_data, variables, context);
      },
    },
  );
};

/**
 * Hook for creating a skill folder
 */
export const useCreateSkillFolderMutation = (
  options?: t.CreateSkillFolderOptions,
): UseMutationResult<t.TSkillFolder, Error, t.CreateSkillFolderBody> => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: t.CreateSkillFolderBody) => dataService.createSkillFolder(data),
    {
      onMutate: (variables) => options?.onMutate?.(variables),
      onError: (error, variables, context) => options?.onError?.(error, variables, context),
      onSuccess: (newFolder, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.skillFolders]);
        return options?.onSuccess?.(newFolder, variables, context);
      },
    },
  );
};

/**
 * Hook for updating a skill folder
 */
export const useUpdateSkillFolderMutation = (
  options?: t.UpdateSkillFolderOptions,
): UseMutationResult<t.TSkillFolder, Error, t.UpdateSkillFolderBody> => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: t.UpdateSkillFolderBody) => dataService.updateSkillFolder(data),
    {
      onMutate: (variables) => options?.onMutate?.(variables),
      onError: (error, variables, context) => options?.onError?.(error, variables, context),
      onSuccess: (updatedFolder, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.skillFolders]);
        return options?.onSuccess?.(updatedFolder, variables, context);
      },
    },
  );
};

/**
 * Hook for deleting a skill folder
 */
export const useDeleteSkillFolderMutation = (
  options?: t.DeleteSkillFolderOptions,
): UseMutationResult<void, Error, t.DeleteSkillFolderBody> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ _id }: t.DeleteSkillFolderBody) => dataService.deleteSkillFolder({ _id }),
    {
      onMutate: (variables) => options?.onMutate?.(variables),
      onError: (error, variables, context) => options?.onError?.(error, variables, context),
      onSuccess: (_data, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.skillFolders]);
        return options?.onSuccess?.(_data, variables, context);
      },
    },
  );
};
