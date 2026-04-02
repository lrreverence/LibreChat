import React, { useState, useCallback, useMemo } from 'react';
import { Button, Sidebar, TooltipAnchor } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useListSkillsQuery, useListSkillFoldersQuery } from '~/data-provider';
import { SkillList } from '../lists';
import FilterSkills from './FilterSkills';
import { cn } from '~/utils';

export default function SkillsSidePanel({
  children,
  className = '',
  closePanelRef,
  onClose,
}: {
  children?: React.ReactNode;
  className?: string;
  closePanelRef?: React.RefObject<HTMLButtonElement>;
  onClose?: () => void;
}) {
  const localize = useLocalize();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const skillsQuery = useListSkillsQuery(
    { search: searchTerm || undefined },
    { enabled: true },
  );
  const foldersQuery = useListSkillFoldersQuery({ enabled: true });

  const filteredSkills = useMemo(() => {
    const skills = skillsQuery.data?.skills ?? [];
    if (!searchTerm) {
      return skills;
    }
    const term = searchTerm.toLowerCase();
    return skills.filter((s) => s.name.toLowerCase().includes(term));
  }, [skillsQuery.data?.skills, searchTerm]);

  const isLoading = skillsQuery.isLoading || foldersQuery.isLoading;

  return (
    <div
      id="skills-panel"
      className={cn('flex h-full w-full flex-col md:mr-2 md:w-[450px] md:shrink-0', className)}
    >
      {onClose && (
        <div className="flex items-center justify-end px-2 py-[2px] md:py-2">
          <TooltipAnchor
            description={localize('com_nav_close_sidebar')}
            render={
              <Button
                ref={closePanelRef}
                size="icon"
                variant="outline"
                data-testid="close-skills-panel-button"
                aria-label={localize('com_nav_close_sidebar')}
                aria-expanded={true}
                className="rounded-full border-none bg-transparent p-2 hover:bg-surface-hover md:rounded-xl"
                onClick={onClose}
              >
                <Sidebar />
              </Button>
            }
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <FilterSkills searchTerm={searchTerm} onSearchChange={handleSearchChange} />
        {children}
        <div className="relative flex h-full flex-col overflow-y-auto">
          <SkillList
            skills={filteredSkills}
            folders={foldersQuery.data ?? []}
            isLoading={isLoading}
            isChatRoute={false}
          />
        </div>
      </div>
    </div>
  );
}
