import { Spinner } from '@librechat/client';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { ParsedSkillMd } from '~/components/Skills/utils/parseSkillMd';
import { CreateSkillForm, SkillForm } from '~/components/Skills/forms';
import { useHasAccess, useAuthContext } from '~/hooks';

interface LocationState {
  uploadData?: ParsedSkillMd;
}

export default function SkillsView() {
  const { skillId } = useParams();
  const location = useLocation();
  const { user, roles } = useAuthContext();
  const isNew = skillId === undefined;

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });

  const rolesLoaded = user?.role != null && roles?.[user.role] != null;
  if (!rolesLoaded) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-presentation">
        <Spinner className="text-text-secondary" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/c/new" replace />;
  }

  if (isNew) {
    const state = location.state as LocationState | undefined;
    const uploadData = state?.uploadData;
    const formKey = uploadData ? `upload-${location.key}` : 'new';

    return (
      <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
        <CreateSkillForm
          key={formKey}
          defaultValues={
            uploadData
              ? {
                  name: uploadData.name,
                  description: uploadData.description,
                  content: uploadData.content,
                  ...(uploadData.invocationMode
                    ? { invocationMode: uploadData.invocationMode }
                    : {}),
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
      <SkillForm skillId={skillId} />
    </div>
  );
}
