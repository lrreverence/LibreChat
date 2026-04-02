import { format } from 'date-fns';
import { TooltipAnchor } from '@librechat/client';
import { User, Calendar, EarthIcon, Sparkles } from 'lucide-react';
import { InvocationMode } from 'librechat-data-provider';
import type { TSkill } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';
import { useLocalize, useAuthContext } from '~/hooks';

const invocationLabelMap: Record<InvocationMode, TranslationKeys> = {
  [InvocationMode.auto]: 'com_ui_invocation_auto',
  [InvocationMode.manual]: 'com_ui_invocation_manual',
  [InvocationMode.both]: 'com_ui_invocation_both',
};

interface SkillDetailHeaderProps {
  skill: TSkill;
}

const SkillDetailHeader = ({ skill }: SkillDetailHeaderProps) => {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const formattedDate = skill.createdAt ? format(new Date(skill.createdAt), 'MMM d, yyyy') : null;
  const isShared = skill.author !== user?.id && Boolean(skill.authorName);
  const isPublic = skill.isPublic === true;

  return (
    <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-xl font-bold text-text-primary" title={skill.name}>
            {skill.name}
          </h2>
          {isPublic && (
            <TooltipAnchor
              description={localize('com_ui_sr_public_skill')}
              side="top"
              render={
                <EarthIcon
                  className="h-5 w-5 shrink-0 text-green-400"
                  aria-label={localize('com_ui_sr_public_skill')}
                />
              }
            />
          )}
        </div>
        {skill.description && (
          <p className="text-sm text-text-secondary sm:truncate">{skill.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          {isShared && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 text-text-secondary" aria-hidden="true" />
              {localize('com_ui_by_author', { 0: skill.authorName })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {localize('com_ui_invoked_by')}: {localize(invocationLabelMap[skill.invocationMode])}
          </span>
          {formattedDate && (
            <time className="flex items-center gap-1" dateTime={skill.createdAt}>
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {formattedDate}
            </time>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillDetailHeader;
