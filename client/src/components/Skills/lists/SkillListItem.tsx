import { memo, useState, useCallback } from 'react';
import { ChevronRight, EarthIcon, FilePlus, FolderPlus, Pencil, Upload, User } from 'lucide-react';
import { Spinner, TooltipAnchor } from '@librechat/client';
import { useNavigate } from 'react-router-dom';
import type { TSkillNode } from 'librechat-data-provider';
import type { TSkill } from 'librechat-data-provider';
import {
  useGetSkillTreeQuery,
  useCreateSkillNodeMutation,
  useUpdateSkillNodeMutation,
  useDeleteSkillNodeMutation,
} from '~/data-provider';
import { SkillFileTree } from '~/components/Skills/tree';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

function ActionButton({
  onClick,
  label,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipAnchor
      description={label}
      side="bottom"
      render={
        <span
          role="button"
          tabIndex={0}
          className="rounded bg-transparent p-1 text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          aria-label={label}
        >
          {children}
        </span>
      }
    />
  );
}

function SkillListItem({ skill }: { skill: TSkill }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [expanded, setExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const isShared = skill.author !== user?.id && Boolean(skill.authorName);
  const isPublic = skill.isPublic === true;
  const { data: treeData, isLoading: treeLoading } = useGetSkillTreeQuery(
    expanded ? skill._id : null,
  );
  const createNode = useCreateSkillNodeMutation(skill._id);
  const updateNode = useUpdateSkillNodeMutation(skill._id);
  const deleteNode = useDeleteSkillNodeMutation(skill._id);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleEditMetadata = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/skills/${skill._id}/edit`);
    },
    [navigate, skill._id],
  );

  const handleSelectNode = useCallback(
    (nodeId: string, nodeType: 'file' | 'folder') => {
      if (nodeType === 'file') {
        setSelectedNodeId(nodeId);
        const node = treeData?.nodes.find((n: TSkillNode) => n._id === nodeId);
        if (node) {
          navigate(`/skills/${skill._id}/file/${nodeId}`);
        }
      }
    },
    [navigate, skill._id, treeData?.nodes],
  );

  const handleRenameNode = useCallback(
    (nodeId: string, newName: string) => {
      updateNode.mutate({ skillId: skill._id, nodeId, data: { name: newName } });
    },
    [updateNode, skill._id],
  );

  const handleMoveNode = useCallback(
    (nodeId: string, newParentId: string | null, index: number) => {
      updateNode.mutate({
        skillId: skill._id,
        nodeId,
        data: { parentId: newParentId, order: index },
      });
    },
    [updateNode, skill._id],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteNode.mutate({ skillId: skill._id, nodeId });
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    },
    [deleteNode, skill._id, selectedNodeId],
  );

  const handleNewFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      createNode.mutate({
        skillId: skill._id,
        data: { type: 'file', name: 'untitled.md', parentId: null },
      });
    },
    [createNode, skill._id],
  );

  const handleNewFolder = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      createNode.mutate({
        skillId: skill._id,
        data: { type: 'folder', name: 'new-folder', parentId: null },
      });
    },
    [createNode, skill._id],
  );

  const handleUpload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
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
          createNode.mutate({ skillId: skill._id, data: formData });
        }
      };
      input.click();
    },
    [skill._id, createNode],
  );

  return (
    <div
      className={cn(
        'group/skill mb-1 rounded-xl border',
        'duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] transition-[border-color,box-shadow]',
        expanded
          ? 'border-border-medium shadow-sm'
          : 'border-border-light hover:border-border-medium',
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={skill.name}
      >
        <ChevronRight
          className={cn(
            'mt-0.5 size-3.5 shrink-0 text-text-secondary',
            'duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] transition-transform',
            expanded && 'rotate-90',
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-text-primary">{skill.name}</span>
            {isShared && (
              <TooltipAnchor
                description={localize('com_ui_by_author', { 0: skill.authorName })}
                side="top"
                render={
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={localize('com_ui_by_author', { 0: skill.authorName })}
                    className="flex shrink-0 items-center"
                  >
                    <User className="size-3.5 text-text-secondary" aria-hidden="true" />
                  </span>
                }
              />
            )}
            {isPublic && (
              <TooltipAnchor
                description={localize('com_ui_sr_public_skill')}
                side="top"
                render={
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={localize('com_ui_sr_public_skill')}
                    className="flex shrink-0 items-center"
                  >
                    <EarthIcon className="size-3.5 text-green-400" aria-hidden="true" />
                  </span>
                }
              />
            )}
          </div>
          {skill.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              {skill.description}
            </p>
          )}
        </div>
      </button>
      <div
        className={cn(
          'duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] grid transition-[grid-template-rows]',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-0.5 border-t border-border-light px-2 py-1">
            <ActionButton onClick={handleNewFile} label={localize('com_ui_skill_new_file')}>
              <FilePlus className="size-3.5" />
            </ActionButton>
            <ActionButton onClick={handleNewFolder} label={localize('com_ui_skill_new_folder')}>
              <FolderPlus className="size-3.5" />
            </ActionButton>
            <ActionButton onClick={handleUpload} label={localize('com_ui_skill_upload_file')}>
              <Upload className="size-3.5" />
            </ActionButton>
            <div className="flex-1" />
            <ActionButton onClick={handleEditMetadata} label={localize('com_ui_edit')}>
              <Pencil className="size-3.5" />
            </ActionButton>
          </div>
          <div className="px-1 pb-2">
            {treeLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner className="size-4 text-text-tertiary" />
              </div>
            ) : (
              <SkillFileTree
                nodes={treeData?.nodes ?? []}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onRenameNode={handleRenameNode}
                onMoveNode={handleMoveNode}
                onDeleteNode={handleDeleteNode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SkillListItem);
