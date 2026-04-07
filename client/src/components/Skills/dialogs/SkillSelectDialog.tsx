import { useState, useMemo, useCallback } from 'react';
import { Search, Check, EarthIcon, User, Plus, Star, ListFilter, X } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { OGDialog, OGDialogContent } from '@librechat/client';
import { PermissionTypes, Permissions, SystemCategories } from 'librechat-data-provider';
import type { TSkill } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useListSkillsQuery } from '~/data-provider';
import { CategoryIcon } from '~/components/Prompts';
import {
  useLocalize,
  useAuthContext,
  useCategories,
  useHasAccess,
  useSkillFavorites,
} from '~/hooks';
import { cn } from '~/utils';

interface SkillSelectDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SKILL_MY = 'my_skills';
const SKILL_FAVORITES = 'favorites';

function SkillSelectDialog({ isOpen, setIsOpen }: SkillSelectDialogProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { getValues, setValue } = useFormContext<AgentForm>();
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>(SystemCategories.ALL);
  const { isFavorite: isFavoriteSkill, toggle: toggleFavoriteSkill } = useSkillFavorites();

  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.CREATE,
  });

  const { data: skillsData } = useListSkillsQuery({ limit: 100 });
  const { categories } = useCategories({ className: 'size-4', hasAccess: true });

  const allSkills = useMemo(() => skillsData?.data ?? [], [skillsData?.data]);
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

  const handleCreate = useCallback(() => {
    setIsOpen(false);
    navigate('/skills/new');
  }, [navigate, setIsOpen]);

  const visibleSkills = useMemo(() => {
    let filtered = allSkills;

    if (activeFilter === SKILL_MY) {
      filtered = filtered.filter((s) => s.author === user?.id);
    } else if (activeFilter === SKILL_FAVORITES) {
      filtered = filtered.filter((s) => isFavoriteSkill(s._id));
    } else if (activeFilter === SystemCategories.NO_CATEGORY) {
      filtered = filtered.filter((s) => !s.category);
    } else if (activeFilter !== SystemCategories.ALL) {
      filtered = filtered.filter((s) => s.category === activeFilter);
    }

    if (searchValue) {
      const lower = searchValue.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(lower));
    }

    return filtered;
  }, [allSkills, activeFilter, searchValue, user?.id, isFavoriteSkill]);

  const renderSkillCard = (skill: TSkill) => {
    const selected = isAttached(skill._id);
    const isFavorite = isFavoriteSkill(skill._id);
    const isShared = skill.author !== user?.id && Boolean(skill.authorName);
    const isPublic = skill.isPublic === true;
    return (
      <div
        key={skill._id}
        role="option"
        aria-selected={selected}
        onClick={() => handleToggleSkill(skill._id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleSkill(skill._id);
          }
        }}
        tabIndex={0}
        className={cn(
          'group relative flex h-32 cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary',
          selected
            ? 'border-green-500/70 bg-green-500/[0.06]'
            : 'border-border-light hover:border-border-medium hover:bg-surface-tertiary',
        )}
      >
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate pr-1 text-sm font-semibold text-text-primary">
            {skill.name}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteSkill(skill._id);
            }}
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
              isFavorite
                ? 'text-yellow-500 hover:bg-yellow-500/10'
                : 'text-text-tertiary opacity-0 hover:bg-surface-hover hover:text-text-primary group-hover:opacity-100',
            )}
            aria-label={isFavorite ? localize('com_ui_unfavorite') : localize('com_ui_favorite')}
            aria-pressed={isFavorite}
          >
            <Star className={cn('size-4', isFavorite && 'fill-current')} aria-hidden="true" />
          </button>
        </div>
        {skill.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
            {skill.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          {skill.category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-tertiary">
              <CategoryIcon category={skill.category} className="size-2.5" />
              {skill.category}
            </span>
          )}
          {isShared && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-1.5 py-0.5 text-text-tertiary"
              title={skill.authorName}
            >
              <User className="size-2.5" aria-hidden="true" />
            </span>
          )}
          {isPublic && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-1.5 py-0.5 text-text-tertiary"
              title={localize('com_ui_sr_public_skill')}
            >
              <EarthIcon className="size-2.5" aria-hidden="true" />
            </span>
          )}
          <span
            className={cn(
              'ml-auto flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-200',
              selected ? 'scale-100 bg-green-500 text-white opacity-100' : 'scale-75 opacity-0',
            )}
            aria-hidden="true"
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
        </div>
      </div>
    );
  };

  const SidebarItem = ({
    value,
    label,
    icon,
  }: {
    value: string;
    label: string;
    icon: React.ReactNode;
  }) => {
    const isActive = activeFilter === value;
    return (
      <button
        type="button"
        onClick={() => setActiveFilter(value)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
          isActive
            ? 'bg-surface-active text-text-primary'
            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
        aria-pressed={isActive}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogContent
        className="w-11/12 max-w-[1024px] overflow-hidden rounded-2xl border-border-medium p-0 shadow-xl md:max-h-[85vh]"
        showCloseButton={false}
      >
        <div className="flex h-[80vh] max-h-[720px]">
          {/* Left sidebar */}
          <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-border-light bg-surface-primary-alt p-3">
            <h2 className="px-2.5 pb-1.5 pt-1 text-base font-bold text-text-primary">
              {localize('com_ui_add_skills')}
            </h2>
            {hasCreateAccess && (
              <button
                type="button"
                onClick={handleCreate}
                className="mb-1 flex w-full items-center justify-center gap-2 rounded-lg border border-border-light bg-transparent px-2.5 py-1.5 text-center text-sm text-text-primary transition-colors hover:border-border-medium hover:bg-surface-hover"
                aria-label={localize('com_ui_create_skill')}
              >
                <Plus className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{localize('com_ui_create_skill')}</span>
              </button>
            )}
            <SidebarItem
              value={SKILL_MY}
              label={localize('com_ui_my_skills')}
              icon={<User className="size-4 text-text-secondary" />}
            />
            <SidebarItem
              value={SKILL_FAVORITES}
              label={localize('com_ui_favorites')}
              icon={<Star className="size-4 text-text-secondary" />}
            />
            <div className="my-2 h-px bg-border-light" />
            <SidebarItem
              value={SystemCategories.ALL}
              label={localize('com_ui_all_proper')}
              icon={<ListFilter className="size-4 text-text-secondary" />}
            />
            {(
              categories as { value: string; label: string; icon?: React.ReactNode }[] | undefined
            )?.map((category) => {
              if (!category.value) {
                return null;
              }
              return (
                <SidebarItem
                  key={category.value}
                  value={category.value}
                  label={category.label}
                  icon={category.icon ?? <ListFilter className="size-4 text-text-secondary" />}
                />
              );
            })}
          </aside>

          {/* Main content */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border-light px-6 py-4">
              <div className="relative flex-1">
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
              <button
                type="button"
                onClick={handleClose}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-light bg-transparent text-text-secondary transition-colors hover:border-border-medium hover:bg-surface-hover hover:text-text-primary"
                aria-label={localize('com_ui_close')}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
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
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}

export default SkillSelectDialog;
