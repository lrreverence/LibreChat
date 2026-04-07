import { useState, useMemo, useCallback } from 'react';
import { Search, Check, EarthIcon, User } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { OGDialog, OGDialogContent } from '@librechat/client';
import type { TSkill } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useListSkillsQuery } from '~/data-provider';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

interface SkillSelectDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function SkillSelectDialog({ isOpen, setIsOpen }: SkillSelectDialogProps) {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { getValues, setValue } = useFormContext<AgentForm>();
  const [searchValue, setSearchValue] = useState('');

  const { data: skillsData } = useListSkillsQuery({ limit: 100 });

  const allSkills = useMemo(() => skillsData?.data ?? [], [skillsData?.data]);

  const selectedSkills: string[] = getValues('skills') ?? [];

  const handleToggleSkill = useCallback(
    (skillId: string) => {
      const current: string[] = getValues('skills') ?? [];
      if (current.includes(skillId)) {
        setValue(
          'skills',
          current.filter((id) => id !== skillId),
        );
      } else {
        setValue('skills', [...current, skillId]);
      }
    },
    [getValues, setValue],
  );

  const isAttached = useCallback(
    (skillId: string): boolean => {
      const current: string[] = getValues('skills') ?? [];
      return current.includes(skillId);
    },
    [getValues],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchValue('');
  }, [setIsOpen]);

  const visibleSkills = useMemo(() => {
    if (!searchValue) {
      return allSkills;
    }
    const lower = searchValue.toLowerCase();
    return allSkills.filter((s) => s.name.toLowerCase().includes(lower));
  }, [allSkills, searchValue]);

  const renderSkillCard = (skill: TSkill) => {
    const selected = isAttached(skill._id);
    const isShared = skill.author !== user?.id && Boolean(skill.authorName);
    const isPublic = skill.isPublic === true;
    return (
      <button
        key={skill._id}
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => handleToggleSkill(skill._id)}
        className={cn(
          'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200',
          selected
            ? 'border-green-500/60 bg-green-500/[0.06]'
            : 'border-border-light hover:border-border-medium hover:bg-surface-tertiary',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">{skill.name}</p>
          {skill.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              {skill.description}
            </p>
          )}
          {(isShared || isPublic) && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {isShared && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-tertiary">
                  <User className="size-2.5" aria-hidden="true" />
                  {skill.authorName}
                </span>
              )}
              {isPublic && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-tertiary">
                  <EarthIcon className="size-2.5" aria-hidden="true" />
                  {localize('com_ui_sr_public_skill')}
                </span>
              )}
            </div>
          )}
        </div>
        <span
          className={cn(
            'mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
            selected ? 'border-green-500 bg-green-500' : 'border-border-medium bg-transparent',
          )}
          aria-hidden="true"
        >
          <Check
            className={cn(
              'size-3 text-white transition-all duration-200',
              selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
          />
        </span>
      </button>
    );
  };

  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogContent
        className="w-11/12 max-w-[960px] overflow-hidden rounded-2xl border-border-medium p-0 shadow-xl md:max-h-[85vh]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex flex-col gap-4 px-6 pb-0 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              {localize('com_ui_add_skills')}{' '}
              <span className="text-sm font-normal text-text-tertiary">
                ({localize('com_ui_count_selected', { count: selectedSkills.length })})
              </span>
            </h2>
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={localize('com_ui_search_skills')}
              aria-label={localize('com_ui_search_skills')}
              className="h-10 w-full rounded-xl border border-border-light bg-transparent pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="mt-4 flex min-h-[300px] overflow-hidden border-t border-border-light">
          <div
            className="flex-1 overflow-y-auto p-4"
            role="listbox"
            aria-label={localize('com_ui_add_skills')}
          >
            {visibleSkills.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">{visibleSkills.map(renderSkillCard)}</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="size-8 text-text-tertiary opacity-40" aria-hidden="true" />
                <p className="mt-3 text-sm text-text-secondary">
                  {localize('com_ui_no_skills_found')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-light px-6 py-4">
          <p className="text-[13px] text-text-secondary" aria-live="polite">
            {localize('com_ui_skills_selected_count', { count: selectedSkills.length })}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 rounded-xl bg-green-600 px-5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            aria-label={localize('com_ui_done')}
          >
            {localize('com_ui_done')}
          </button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}

export default SkillSelectDialog;
