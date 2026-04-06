import { useState, useCallback } from 'react';
import { Spinner } from '@librechat/client';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { ParsedSkillMd } from '~/components/Skills/utils/parseSkillMd';
import {
  SkillFileTree,
  TreeToolbar,
  SkillFileEditor,
  SkillFilePreview,
} from '~/components/Skills/tree';
import {
  useGetSkillTreeQuery,
  useCreateSkillNodeMutation,
  useUpdateSkillNodeMutation,
} from '~/data-provider';
import { CreateSkillForm, SkillForm } from '~/components/Skills/forms';
import SkillState from '~/components/Skills/display/SkillState';
import { useHasAccess, useAuthContext, useLocalize } from '~/hooks';

interface LocationState {
  uploadData?: ParsedSkillMd;
}

interface SelectedNode {
  id: string;
  type: 'file' | 'folder';
  name: string;
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

function renderFilePanel(
  skillId: string,
  selectedNode: SelectedNode | null,
  localize: ReturnType<typeof useLocalize>,
) {
  if (selectedNode?.type !== 'file') {
    return (
      <SkillState
        title={localize('com_ui_skill_select_file')}
        description={localize('com_ui_skill_select_file_desc')}
      />
    );
  }

  if (isTextFile(selectedNode.name)) {
    return (
      <SkillFileEditor skillId={skillId} nodeId={selectedNode.id} fileName={selectedNode.name} />
    );
  }

  return (
    <SkillFilePreview skillId={skillId} nodeId={selectedNode.id} fileName={selectedNode.name} />
  );
}

export default function SkillsView() {
  const { skillId } = useParams();
  const location = useLocation();
  const { user, roles } = useAuthContext();
  const localize = useLocalize();
  const isNew = skillId === undefined;
  const isEdit = location.pathname.endsWith('/edit');
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });

  const { data: treeData, isLoading: treeLoading } = useGetSkillTreeQuery(
    !isNew && !isEdit ? skillId : null,
  );
  const createNode = useCreateSkillNodeMutation(skillId ?? '');
  const updateNode = useUpdateSkillNodeMutation(skillId ?? '');

  const handleSelectNode = useCallback(
    (nodeId: string, nodeType: 'file' | 'folder') => {
      const node = treeData?.nodes.find((n) => n._id === nodeId);
      if (node) {
        setSelectedNode({ id: nodeId, type: nodeType, name: node.name });
      }
    },
    [treeData?.nodes],
  );

  const handleRenameNode = useCallback(
    (nodeId: string, newName: string) => {
      updateNode.mutate({ skillId: skillId!, nodeId, data: { name: newName } });
    },
    [updateNode, skillId],
  );

  const handleMoveNode = useCallback(
    (nodeId: string, newParentId: string | null, index: number) => {
      updateNode.mutate({
        skillId: skillId!,
        nodeId,
        data: { parentId: newParentId, order: index },
      });
    },
    [updateNode, skillId],
  );

  const handleNewFile = useCallback(() => {
    const parentId = selectedNode?.type === 'folder' ? selectedNode.id : null;
    createNode.mutate({
      skillId: skillId!,
      data: { type: 'file', name: 'untitled.md', parentId },
    });
  }, [createNode, skillId, selectedNode]);

  const handleNewFolder = useCallback(() => {
    const parentId = selectedNode?.type === 'folder' ? selectedNode.id : null;
    createNode.mutate({
      skillId: skillId!,
      data: { type: 'folder', name: 'new-folder', parentId },
    });
  }, [createNode, skillId, selectedNode]);

  const handleUpload = useCallback(() => {
    // File upload will be wired in a follow-up
  }, []);

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

  return (
    <div className="flex h-full w-full bg-presentation">
      <div className="flex h-full w-64 shrink-0 flex-col border-r border-border-light">
        <TreeToolbar
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onUpload={handleUpload}
        />
        {treeLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="text-text-secondary" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <SkillFileTree
              nodes={treeData?.nodes ?? []}
              selectedNodeId={selectedNode?.id ?? null}
              onSelectNode={handleSelectNode}
              onRenameNode={handleRenameNode}
              onMoveNode={handleMoveNode}
              height={600}
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {renderFilePanel(skillId!, selectedNode, localize)}
      </div>
    </div>
  );
}
