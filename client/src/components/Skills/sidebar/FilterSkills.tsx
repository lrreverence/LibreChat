import React from 'react';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { FilterInput } from '@librechat/client';
import { CreateSkillMenu } from '~/components/Skills/buttons';
import { useHasAccess, useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function FilterSkills({
  searchTerm,
  onSearchChange,
  className = '',
}: {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const localize = useLocalize();
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.CREATE,
  });

  return (
    <div role="search" className={cn('flex items-center gap-2', className)}>
      <FilterInput
        inputId="skills-filter"
        label={localize('com_ui_filter_skills_name')}
        value={searchTerm}
        onChange={onSearchChange}
        containerClassName="flex-1"
      />
      {hasCreateAccess && <CreateSkillMenu />}
    </div>
  );
}
