import { useState, useMemo, useCallback } from 'react';
import { Search, Check, FolderOpen, ListFilter, EarthIcon, User } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { OGDialog, OGDialogContent } from '@librechat/client';
import type { TSkill, TSkillFolder } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useListSkillsQuery, useListSkillFoldersQuery } from '~/data-provider';
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
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const { data: skillsData } = useListSkillsQuery({ limit: 100 });
  const { data: folders = [] } = useListSkillFoldersQuery();

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
    setActiveFolder(null);
  }, [setIsOpen]);

  const { grouped, folderCounts } = useMemo(() => {
    const fMap = new Map<string, TSkillFolder>();
    for (const folder of folders) {
      fMap.set(folder._id, folder);
    }

    const buckets = new Map<string | null, TSkill[]>();
    for (const skill of allSkills) {
      const key = skill.folderId && fMap.has(skill.folderId) ? skill.folderId : null;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(skill);
      } else {
        buckets.set(key, [skill]);
      }
    }

    const counts = new Map<string | null, number>();
    for (const [key, skills] of buckets) {
      counts.set(key, skills.length);
    }

    return { grouped: buckets, folderCounts: counts };
  }, [allSkills, folders]);

  const visibleSkills = useMemo(() => {
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      const filtered = allSkills.filter((s) => s.name.toLowerCase().includes(lower));
      return { flat: filtered, grouped: null };
    }

    if (activeFolder !== null) {
      const folderSkills =
        activeFolder === '__uncategorized__'
          ? (grouped.get(null) ?? [])
          : (grouped.get(activeFolder) ?? []);
      return { flat: folderSkills, grouped: null };
    }

    return { flat: null, grouped };
  }, [allSkills, searchValue, activeFolder, grouped]);

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
              onChange={(e) => {
                setSearchValue(e.target.value);
                if (e.target.value) {
                  setActiveFolder(null);
                }
              }}
              placeholder={localize('com_ui_search_skills')}
              aria-label={localize('com_ui_search_skills')}
              className="h-10 w-full rounded-xl border border-border-light bg-transparent pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="mt-4 flex min-h-[300px] overflow-hidden border-t border-border-light">
          {/* Sidebar */}
          <nav className="flex w-[170px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border-light p-2">
            <button
              type="button"
              onClick={() => setActiveFolder(null)}
              aria-pressed={activeFolder === null && !searchValue}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                activeFolder === null && !searchValue
                  ? 'bg-surface-tertiary font-medium text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
            >
              <ListFilter className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
              <span className="truncate">{localize('com_ui_all_proper')}</span>
              <span className="ml-auto text-[11px] text-text-tertiary">{allSkills.length}</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder._id}
                type="button"
                onClick={() => setActiveFolder(folder._id)}
                aria-pressed={activeFolder === folder._id}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                  activeFolder === folder._id
                    ? 'bg-surface-tertiary font-medium text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                )}
              >
                <FolderOpen className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-[11px] text-text-tertiary">
                  {folderCounts.get(folder._id) ?? 0}
                </span>
              </button>
            ))}
            {(folderCounts.get(null) ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setActiveFolder('__uncategorized__')}
                aria-pressed={activeFolder === '__uncategorized__'}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                  activeFolder === '__uncategorized__'
                    ? 'bg-surface-tertiary font-medium text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                )}
              >
                <ListFilter className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                <span className="truncate">{localize('com_ui_uncategorized')}</span>
                <span className="ml-auto text-[11px] text-text-tertiary">
                  {folderCounts.get(null) ?? 0}
                </span>
              </button>
            )}
          </nav>

          {/* Skill grid */}
          <div
            className="flex-1 overflow-y-auto p-4"
            role="listbox"
            aria-label={localize('com_ui_add_skills')}
          >
            {visibleSkills.flat != null && visibleSkills.flat.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {visibleSkills.flat.map(renderSkillCard)}
              </div>
            )}
            {visibleSkills.flat != null && visibleSkills.flat.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="size-8 text-text-tertiary opacity-40" aria-hidden="true" />
                <p className="mt-3 text-sm text-text-secondary">
                  {localize('com_ui_no_skills_found')}
                </p>
              </div>
            )}
            {visibleSkills.flat == null && visibleSkills.grouped != null && (
              <div className="flex flex-col gap-3">
                {folders.map((folder) => {
                  const folderSkills = visibleSkills.grouped!.get(folder._id);
                  if (!folderSkills || folderSkills.length === 0) {
                    return null;
                  }
                  return (
                    <div key={folder._id}>
                      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                        {folder.name}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {folderSkills.map(renderSkillCard)}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const uncategorized = visibleSkills.grouped!.get(null);
                  if (!uncategorized || uncategorized.length === 0) {
                    return null;
                  }
                  return (
                    <div>
                      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                        {localize('com_ui_uncategorized')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {uncategorized.map(renderSkillCard)}
                      </div>
                    </div>
                  );
                })()}
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
