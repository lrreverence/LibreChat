import { useNavigate } from 'react-router-dom';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { Button, TextareaAutosize, Input, useToastContext } from '@librechat/client';
import { InvocationMode } from 'librechat-data-provider';
import type { TCreateSkillRequest } from 'librechat-data-provider';
import InvocationModePicker from './InvocationModePicker';
import { useCreateSkillMutation } from '~/data-provider';
import CategorySelector from './CategorySelector';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type CreateSkillFormValues = {
  name: string;
  description: string;
  invocationMode: InvocationMode;
  category: string;
};

const defaultSkill: CreateSkillFormValues = {
  name: '',
  description: '',
  invocationMode: InvocationMode.auto,
  category: '',
};

interface CreateSkillFormProps {
  defaultValues?: Partial<CreateSkillFormValues>;
  onSuccess?: (skillId: string) => void;
}

const CreateSkillForm = ({ defaultValues, onSuccess }: CreateSkillFormProps) => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const methods = useForm<CreateSkillFormValues>({
    defaultValues: { ...defaultSkill, ...defaultValues },
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting, isValid },
  } = methods;

  const createSkillMutation = useCreateSkillMutation({
    onSuccess: (newSkill) => {
      if (onSuccess) {
        onSuccess(newSkill._id);
      } else {
        navigate(`/skills/${newSkill._id}/edit`, { replace: true });
      }
    },
    onError: () => {
      showToast({
        status: 'error',
        message: localize('com_ui_skill_create_error'),
      });
    },
  });

  const onSubmit = (data: CreateSkillFormValues) => {
    const body: TCreateSkillRequest = {
      name: data.name,
      description: data.description,
      invocationMode: data.invocationMode,
    };
    if (data.category) {
      body.category = data.category;
    }
    createSkillMutation.mutate(body);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full px-4 py-2">
        <h1 className="sr-only">{localize('com_ui_create_skill_page')}</h1>
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
                  className="w-full resize-none rounded-xl border border-border-medium bg-transparent p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
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
              aria-label={localize('com_ui_create_skill')}
              className={cn(
                'w-full sm:w-auto',
                (!isDirty || isSubmitting || !isValid) && 'opacity-50',
              )}
              tabIndex={0}
              type="submit"
              aria-disabled={!isDirty || isSubmitting || !isValid || undefined}
              onClick={(e: React.MouseEvent) => {
                if (!isDirty || isSubmitting || !isValid) {
                  e.preventDefault();
                }
              }}
            >
              {localize('com_ui_create_skill')}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default CreateSkillForm;
