import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Skeleton } from '@librechat/client';
import type { TSkill, TSkillFolder } from 'librechat-data-provider';
import FolderSection from './FolderSection';
import { useLocalize } from '~/hooks';

export default function SkillList({
  skills = [],
  folders = [],
  isLoading,
  isChatRoute = true,
}: {
  skills?: TSkill[];
  folders?: TSkillFolder[];
  isLoading: boolean;
  isChatRoute?: boolean;
}) {
  const localize = useLocalize();

  const { folderMap: _folderMap, grouped } = useMemo(() => {
    const fMap = new Map<string, TSkillFolder>();
    for (const folder of folders) {
      fMap.set(folder._id, folder);
    }

    const buckets = new Map<string | null, TSkill[]>();
    for (const skill of skills) {
      const key = skill.folderId && fMap.has(skill.folderId) ? skill.folderId : null;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(skill);
      } else {
        buckets.set(key, [skill]);
      }
    }

    return { folderMap: fMap, grouped: buckets };
  }, [skills, folders]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-1">
        <Skeleton className="my-2 flex h-[84px] w-full rounded-2xl border-0 px-3 pb-4 pt-3" />
        <Skeleton className="my-2 flex h-[84px] w-full rounded-2xl border-0 px-3 pb-4 pt-3" />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="my-2 flex flex-col items-center justify-center rounded-lg border border-border-light bg-transparent p-6 text-center">
        <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-tertiary">
          <FileText className="size-5 text-text-secondary" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-text-primary">
          {localize('com_ui_no_skills_title')}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{localize('com_ui_add_first_skill')}</p>
      </div>
    );
  }

  const folderSections: React.ReactNode[] = [];
  for (const folder of folders) {
    const folderSkills = grouped.get(folder._id);
    if (folderSkills && folderSkills.length > 0) {
      folderSections.push(
        <FolderSection
          key={folder._id}
          folder={folder}
          skills={folderSkills}
          isChatRoute={isChatRoute}
        />,
      );
    }
  }

  const uncategorized = grouped.get(null);
  if (uncategorized && uncategorized.length > 0) {
    folderSections.push(
      <FolderSection
        key="uncategorized"
        folder={null}
        skills={uncategorized}
        isChatRoute={isChatRoute}
      />,
    );
  }

  return (
    <div className="flex h-full flex-col">
      <section className="flex-grow overflow-y-auto" aria-label={localize('com_ui_skill_list')}>
        <div className="overflow-y-auto overflow-x-hidden">{folderSections}</div>
      </section>
    </div>
  );
}
