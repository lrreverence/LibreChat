import { useState, useCallback } from 'react';
import { FilePlus, FolderPlus, Pencil, Upload } from 'lucide-react';
import { Spinner, TooltipAnchor } from '@librechat/client';
import { Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { ParsedSkillMd } from '~/components/Skills/utils/parseSkillMd';
import { SkillFileTree, SkillFileEditor, SkillFilePreview } from '~/components/Skills/tree';
import {
  useGetSkillTreeQuery,
  useGetSkillNodeContentQuery,
  useCreateSkillNodeMutation,
  useUpdateSkillNodeMutation,
  useDeleteSkillNodeMutation,
} from '~/data-provider';
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

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipAnchor
      description={label}
      side="bottom"
      render={
        <button
          type="button"
          className="rounded-md bg-transparent p-1 text-text-secondary transition-colors duration-100 hover:bg-surface-hover hover:text-text-primary"
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </button>
      }
    />
  );
}

function FilePanel({ skillId, nodeId }: { skillId: string; nodeId: string }) {
  const { data, isLoading } = useGetSkillNodeContentQuery(skillId, nodeId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-presentation">
        <Spinner className="text-text-tertiary" />
      </div>
    );
  }

  const fileName = (data as { name?: string } | undefined)?.name ?? nodeId;
  const mimeType = data?.mimeType ?? 'text/plain';

  if (mimeType.startsWith('text/') || isTextFile(fileName)) {
    return <SkillFileEditor skillId={skillId} nodeId={nodeId} fileName={fileName} />;
  }

  return <SkillFilePreview skillId={skillId} nodeId={nodeId} fileName={fileName} />;
}

function TreeView({ skillId, nodeId }: { skillId: string; nodeId?: string }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodeId ?? null);

  const { data: treeData, isLoading: treeLoading } = useGetSkillTreeQuery(skillId);
  const createNode = useCreateSkillNodeMutation(skillId);
  const updateNode = useUpdateSkillNodeMutation(skillId);
  const deleteNode = useDeleteSkillNodeMutation(skillId);

  const handleSelectNode = useCallback(
    (id: string, nodeType: 'file' | 'folder') => {
      if (nodeType === 'file') {
        setSelectedNodeId(id);
        navigate(`/skills/${skillId}/file/${id}`);
      }
    },
    [navigate, skillId],
  );

  const handleRenameNode = useCallback(
    (id: string, newName: string) => {
      updateNode.mutate({ skillId, nodeId: id, data: { name: newName } });
    },
    [updateNode, skillId],
  );

  const handleMoveNode = useCallback(
    (id: string, newParentId: string | null, index: number) => {
      updateNode.mutate({ skillId, nodeId: id, data: { parentId: newParentId, order: index } });
    },
    [updateNode, skillId],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      deleteNode.mutate({ skillId, nodeId: id });
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
        navigate(`/skills/${skillId}`);
      }
    },
    [deleteNode, skillId, selectedNodeId, navigate],
  );

  const handleNewFile = useCallback(() => {
    createNode.mutate({ skillId, data: { type: 'file', name: 'untitled.md', parentId: null } });
  }, [createNode, skillId]);

  const handleNewFolder = useCallback(() => {
    createNode.mutate({ skillId, data: { type: 'folder', name: 'new-folder', parentId: null } });
  }, [createNode, skillId]);

  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      const files = input.files;
      if (!files) {
        return;
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'file');
        formData.append('name', file.name);
        createNode.mutate({ skillId, data: formData });
      }
    };
    input.click();
  }, [skillId, createNode]);

  const handleEditMetadata = useCallback(() => {
    navigate(`/skills/${skillId}/edit`);
  }, [navigate, skillId]);

  return (
    <div className="flex h-full w-full bg-presentation">
      <div className="flex h-full w-60 shrink-0 flex-col border-r border-border-light">
        <div className="flex items-center gap-0.5 border-b border-border-light px-2 py-1.5">
          <ToolbarButton onClick={handleNewFile} label={localize('com_ui_skill_new_file')}>
            <FilePlus className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleNewFolder} label={localize('com_ui_skill_new_folder')}>
            <FolderPlus className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleUpload} label={localize('com_ui_skill_upload_file')}>
            <Upload className="size-3.5" />
          </ToolbarButton>
          <div className="flex-1" />
          <ToolbarButton onClick={handleEditMetadata} label={localize('com_ui_edit')}>
            <Pencil className="size-3.5" />
          </ToolbarButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          {treeLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-4 text-text-tertiary" />
            </div>
          ) : (
            <div className="py-1">
              <SkillFileTree
                nodes={treeData?.nodes ?? []}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onRenameNode={handleRenameNode}
                onMoveNode={handleMoveNode}
                onDeleteNode={handleDeleteNode}
              />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {nodeId ? (
          <FilePanel skillId={skillId} nodeId={nodeId} />
        ) : (
          <SkillState
            title={localize('com_ui_skill_select_file')}
            description={localize('com_ui_skill_select_file_desc')}
          />
        )}
      </div>
    </div>
  );
}

export default function SkillsView() {
  const { skillId, nodeId } = useParams();
  const location = useLocation();
  const { user, roles } = useAuthContext();
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

  if (skillId) {
    return <TreeView skillId={skillId} nodeId={nodeId} />;
  }

  return null;
}
