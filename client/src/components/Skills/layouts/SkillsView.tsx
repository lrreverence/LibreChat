import { Navigate, useParams } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { Spinner } from '@librechat/client';
import { useGetSkillByIdQuery } from '~/data-provider/Skills/queries';
import { SkillDetail } from '~/components/Skills/display';
import { useHasAccess, useLocalize } from '~/hooks';

export default function SkillsView() {
  const { skillId } = useParams();
  const localize = useLocalize();
  const isNew = skillId === undefined;

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });

  const { data: skill, isLoading, isError } = useGetSkillByIdQuery(skillId);

  if (!hasAccess) {
    return <Navigate to="/c/new" replace />;
  }

  if (isNew) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-presentation">
        <p className="text-text-secondary text-sm">{localize('com_ui_select_skill')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-presentation">
        <Spinner className="text-text-secondary" />
      </div>
    );
  }

  if (isError || !skill) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-presentation">
        <p className="text-text-secondary text-sm">{localize('com_ui_skill_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
      <SkillDetail skill={skill} />
    </div>
  );
}
