import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { Button, TextareaAutosize, Input, Skeleton, useToastContext } from '@librechat/client';
import { InvocationMode } from 'librechat-data-provider';
import InvocationModePicker from './InvocationModePicker';
import CategorySelector from './CategorySelector';
import { useGetSkillByIdQuery, useUpdateSkillMutation } from '~/data-provider';
import { ShareSkill } from '../buttons';
import DeleteSkill from '../dialogs/DeleteSkill';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

type SkillFormValues = {
  name: string;
  description: string;
  invocationMode: InvocationMode;
  category: string;
};

const SkillForm = ({ skillId: skillIdProp }: { skillId?: string }) => {
  const params = useParams();
  const localize = useLocalize();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToastContext();
  const skillId = skillIdProp || params.skillId || '';

  const { data: skill, isLoading } = useGetSkillByIdQuery(skillId, {
    enabled: !!skillId,
  });

  const methods = useForm<SkillFormValues>({
    defaultValues: {
      name: '',
      description: '',
      invocationMode: InvocationMode.auto,
      category: '',
    },
    values: skill
      ? {
          name: skill.name,
          description: skill.description,
          invocationMode: skill.invocationMode,
          category: skill.category ?? '',
        }
      : undefined,
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = methods;

  const updateSkillMutation = useUpdateSkillMutation({
    onSuccess: () => {
      showToast({
        status: 'success',
        message: localize('com_ui_skill_updated'),
      });
    },
    onError: () => {
      showToast({
        status: 'error',
        message: localize('com_ui_skill_update_error'),
      });
    },
  });

  const onSubmit = (data: SkillFormValues) => {
    updateSkillMutation.mutate({
      _id: skillId,
      data: {
        name: data.name,
        description: data.description,
        invocationMode: data.invocationMode,
        category: data.category,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-2">
        <Skeleton className="mb-4 h-10 w-48" />
        <Skeleton className="mb-4 h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!skill) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full px-4 py-2">
        <h1 className="sr-only">{localize('com_ui_edit_skill_page')}</h1>
        <div className="mb-1 flex flex-col items-center justify-between font-bold sm:text-xl md:mb-0 md:text-2xl">
          <div className="flex w-full flex-col items-center justify-between sm:flex-row">
            <Controller
              name="name"
              control={control}
              rules={{ required: localize('com_ui_skill_name_required') }}
              render={({ field, fieldState: { error } }) => (
                <div className="relative mb-1 flex w-full flex-col sm:w-auto md:mb-0">
                  <Input
                    {...field}
                    id="skill-name"
                    type="text"
                    className="peer mr-2 w-full border border-border-medium p-2 text-2xl text-text-primary"
                    placeholder=" "
                    tabIndex={0}
                    aria-label={localize('com_ui_name')}
                    aria-required="true"
                  />
                  <label
                    htmlFor="skill-name"
                    className="pointer-events-none absolute -top-1 left-3 origin-[0] translate-y-3 scale-100 rounded bg-presentation px-1 text-base text-text-secondary transition-transform duration-200 peer-placeholder-shown:translate-y-3 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-text-primary peer-[:not(:placeholder-shown)]:-translate-y-2 peer-[:not(:placeholder-shown)]:scale-75"
                  >
                    {localize('com_ui_name')}*
                  </label>
                  <div
                    className={cn(
                      'mt-1 w-56 text-sm text-red-500',
                      error ? 'visible h-auto' : 'invisible h-0',
                    )}
                  >
                    {error ? error.message : ' '}
                  </div>
                </div>
              )}
            />
            <div className="flex items-center gap-2">
              <CategorySelector />
              <ShareSkill skill={skill} />
              {skill.author === user?.id && (
                <DeleteSkill
                  skillId={skill._id}
                  skillName={skill.name}
                  onDelete={() => navigate('/skills/new', { replace: true })}
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-4 md:mt-[1.075rem]">
          <InvocationModePicker
            value={methods.watch('invocationMode')}
            onChange={(mode) => methods.setValue('invocationMode', mode, { shouldDirty: true })}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col">
                <label
                  htmlFor="skill-description"
                  className="mb-1 text-sm font-medium text-text-secondary"
                >
                  {localize('com_ui_description')}
                </label>
                <TextareaAutosize
                  {...field}
                  id="skill-description"
                  className="w-full resize-none rounded-xl border border-border-medium bg-transparent p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
                  minRows={2}
                  maxRows={6}
                  tabIndex={0}
                  placeholder={localize('com_ui_description')}
                  aria-label={localize('com_ui_description')}
                />
              </div>
            )}
          />
          <div className="mt-4 flex justify-end">
            <Button
              aria-label={localize('com_ui_save_skill')}
              className={cn('w-full sm:w-auto', (!isDirty || isSubmitting) && 'opacity-50')}
              tabIndex={0}
              type="submit"
              aria-disabled={!isDirty || isSubmitting || undefined}
              onClick={(e: React.MouseEvent) => {
                if (!isDirty || isSubmitting) {
                  e.preventDefault();
                }
              }}
            >
              {localize('com_ui_save_skill')}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default SkillForm;
