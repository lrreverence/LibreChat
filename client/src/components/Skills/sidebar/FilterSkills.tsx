import React from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, FilterInput, TooltipAnchor } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
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
      {hasCreateAccess && (
        <TooltipAnchor
          description={localize('com_ui_create_skill')}
          side="bottom"
          render={
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9 shrink-0 bg-transparent"
              aria-label={localize('com_ui_create_skill')}
            >
              <Link to="/skills/new">
                <Plus className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
