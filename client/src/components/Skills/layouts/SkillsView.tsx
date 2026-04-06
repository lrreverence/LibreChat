import { Spinner } from '@librechat/client';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { ParsedSkillMd } from '~/components/Skills/utils/parseSkillMd';
import { SkillFileEditor, SkillFilePreview } from '~/components/Skills/tree';
import { useGetSkillNodeContentQuery } from '~/data-provider';
import { CreateSkillForm, SkillForm } from '~/components/Skills/forms';
import SkillState from '~/components/Skills/display/SkillState';
import { useHasAccess, useAuthContext, useLocalize } from '~/hooks';

interface LocationState {
  uploadData?: ParsedSkillMd;
}

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
  '.yaml',
  '.yml',
  '.py',
  '.sh',
  '.css',
  '.html',
  '.xml',
  '.csv',
  '.env',
  '.toml',
  '.ini',
]);

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase();
  for (const ext of TEXT_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

function FileView({ skillId, nodeId }: { skillId: string; nodeId: string }) {
  const { data, isLoading } = useGetSkillNodeContentQuery(skillId, nodeId);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-presentation">
        <Spinner className="text-text-secondary" />
      </div>
    );
  }

  const fileName = (data as { name?: string } | undefined)?.name ?? nodeId;
  const mimeType = data?.mimeType ?? 'text/plain';

  if (mimeType.startsWith('text/') || isTextFile(fileName)) {
    return (
      <div className="flex h-full w-full flex-col bg-presentation">
        <SkillFileEditor skillId={skillId} nodeId={nodeId} fileName={fileName} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-presentation">
      <SkillFilePreview skillId={skillId} nodeId={nodeId} fileName={fileName} />
    </div>
  );
}

export default function SkillsView() {
  const { skillId, nodeId } = useParams();
  const location = useLocation();
  const { user, roles } = useAuthContext();
  const localize = useLocalize();
  const isNew = skillId === undefined;
  const isEdit = location.pathname.endsWith('/edit');

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

  if (isEdit) {
    return (
      <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
        <SkillForm skillId={skillId} />
      </div>
    );
  }

  if (nodeId && skillId) {
    return <FileView skillId={skillId} nodeId={nodeId} />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
      <SkillState
        title={localize('com_ui_skill_select_file')}
        description={localize('com_ui_skill_select_file_desc')}
      />
    </div>
  );
}
