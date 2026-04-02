import { Navigate, useParams } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess, useLocalize } from '~/hooks';

export default function SkillsView() {
  const { skillId } = useParams();
  const localize = useLocalize();
  const isNew = skillId === undefined;

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });

  if (!hasAccess) {
    return <Navigate to="/c/new" replace />;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-presentation">
      {isNew ? (
        <p className="text-text-secondary text-sm">{localize('com_ui_select_skill')}</p>
      ) : (
        <p className="text-text-secondary text-sm">
          {localize('com_ui_skills')}: {skillId}
        </p>
      )}
    </div>
  );
}
