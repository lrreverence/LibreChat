import { memo, useState, useRef, useCallback } from 'react';
import { ChevronRight, EarthIcon, Pencil, User } from 'lucide-react';
import { Spinner, TooltipAnchor } from '@librechat/client';
import { useNavigate, useParams } from 'react-router-dom';
import type { TSkillNode } from 'librechat-data-provider';
import type { TSkill } from 'librechat-data-provider';
import {
  useGetSkillTreeQuery,
  useCreateSkillNodeMutation,
  useUpdateSkillNodeMutation,
  useDeleteSkillNodeMutation,
} from '~/data-provider';
import { SkillFileTree, TreeToolbar } from '~/components/Skills/tree';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

function SkillListItem({ skill }: { skill: TSkill }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuthContext();
  const [expanded, setExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isShared = skill.author !== user?.id && Boolean(skill.authorName);
  const isPublic = skill.isPublic === true;
  const isActive = params.skillId === skill._id;

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

  const handleNewFile = useCallback(() => {
    createNode.mutate({
      skillId: skill._id,
      data: { type: 'file', name: 'untitled.md', parentId: null },
    });
  }, [createNode, skill._id]);

  const handleNewFolder = useCallback(() => {
    createNode.mutate({
      skillId: skill._id,
      data: { type: 'folder', name: 'new-folder', parentId: null },
    });
  }, [createNode, skill._id]);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
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
      e.target.value = '';
    },
    [skill._id, createNode],
  );

  return (
    <div
      className={cn(
        'group/skill mb-1.5 rounded-xl border border-border-light bg-transparent transition-colors',
        isActive && 'bg-surface-hover',
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={skill.name}
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-text-secondary transition-transform duration-200',
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
          {!expanded && skill.description && (
            <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-text-secondary">
              {skill.description}
            </p>
          )}
        </div>
        <button
          type="button"
          className="z-10 shrink-0 rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:text-text-primary group-hover/skill:opacity-100"
          onClick={handleEditMetadata}
          aria-label={localize('com_ui_edit')}
          title={localize('com_ui_edit')}
        >
          <Pencil className="size-3.5" />
        </button>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out"
        style={{
          maxHeight: expanded ? `${(contentRef.current?.scrollHeight ?? 500) + 16}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="border-t border-border-light">
          <TreeToolbar
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            onUpload={handleUpload}
          />
          {treeLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="text-text-secondary" />
            </div>
          ) : (
            <SkillFileTree
              nodes={treeData?.nodes ?? []}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onRenameNode={handleRenameNode}
              onMoveNode={handleMoveNode}
              onDeleteNode={handleDeleteNode}
              height={Math.min((treeData?.nodes.length ?? 0) * 32 + 32, 300)}
            />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

export default memo(SkillListItem);
