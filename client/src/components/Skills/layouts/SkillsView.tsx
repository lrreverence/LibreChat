import { Navigate, useParams, useLocation } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { Spinner } from '@librechat/client';
import { useGetSkillByIdQuery } from '~/data-provider/Skills/queries';
import { SkillDetail } from '~/components/Skills/display';
import { CreateSkillForm, SkillForm } from '~/components/Skills/forms';
import { useHasAccess, useLocalize } from '~/hooks';
import type { ParsedSkillMd } from '~/components/Skills/utils/parseSkillMd';

interface LocationState {
  uploadData?: ParsedSkillMd;
}

export default function SkillsView() {
  const { skillId, action } = useParams();
  const location = useLocation();
  const localize = useLocalize();
  const isNew = skillId === undefined;
  const isEditing = action === 'edit';

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });

  const { data: skill, isLoading, isError } = useGetSkillByIdQuery(skillId);

  if (!hasAccess) {
    return <Navigate to="/c/new" replace />;
  }

  if (isNew) {
    const state = location.state as LocationState | undefined;
    const uploadData = state?.uploadData;

    if (uploadData) {
      return (
        <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
          <CreateSkillForm
            defaultValues={{
              name: uploadData.name,
              description: uploadData.description,
              content: uploadData.content,
              ...(uploadData.invocationMode ? { invocationMode: uploadData.invocationMode } : {}),
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
        <CreateSkillForm />
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

  if (isEditing) {
    return (
      <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
        <SkillForm skillId={skill._id} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
      <SkillDetail skill={skill} />
    </div>
  );
}
