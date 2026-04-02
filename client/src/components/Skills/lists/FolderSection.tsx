import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { TSkill, TSkillFolder } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import SkillListItem from './SkillListItem';

export default function FolderSection({
  folder,
  skills,
  isChatRoute = true,
}: {
  folder: TSkillFolder | null;
  skills: TSkill[];
  isChatRoute?: boolean;
}) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState(true);

  const sectionTitle = folder?.name ?? localize('com_ui_uncategorized');
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="mb-1">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={sectionTitle}
      >
        <Chevron className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        <FolderOpen className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className="truncate">{sectionTitle}</span>
        <span className="ml-auto shrink-0 text-xs text-text-tertiary">{skills.length}</span>
      </button>
      {expanded && (
        <div className="pl-3 pt-1">
          {skills.map((skill) => (
            <SkillListItem key={skill._id} skill={skill} isChatRoute={isChatRoute} />
          ))}
        </div>
      )}
    </div>
  );
}
