import { useRef, useState } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import type { TSkill, TSkillFolder } from 'librechat-data-provider';
import SkillListItem from './SkillListItem';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

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
  const contentRef = useRef<HTMLDivElement>(null);

  const sectionTitle = folder?.name ?? localize('com_ui_uncategorized');

  return (
    <div className="mb-1">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={sectionTitle}
      >
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-text-secondary transition-transform duration-200',
            !expanded && '-rotate-90',
          )}
          aria-hidden="true"
        />
        <FolderOpen className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className="truncate">{sectionTitle}</span>
        <span className="ml-auto shrink-0 text-xs text-text-primary">{skills.length}</span>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out"
        style={{
          maxHeight: expanded ? `${(contentRef.current?.scrollHeight ?? 1000) + 16}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="pt-1">
          {skills.map((skill) => (
            <SkillListItem key={skill._id} skill={skill} isChatRoute={isChatRoute} />
          ))}
        </div>
      </div>
    </div>
  );
}
