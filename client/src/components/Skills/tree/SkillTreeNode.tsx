import { memo, useCallback, useContext, createContext } from 'react';
import { File, Folder, FolderOpen, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { cn } from '~/utils';
import type { NodeRendererProps } from 'react-arborist';

interface SkillTreeData {
  id: string;
  name: string;
  nodeType: 'file' | 'folder';
  fileId?: string;
  children?: SkillTreeData[];
}

interface TreeActions {
  onDeleteNode: (nodeId: string) => void;
}

export const TreeActionsContext = createContext<TreeActions>({ onDeleteNode: () => {} });

function SkillTreeNode({ node, style, dragHandle }: NodeRendererProps<SkillTreeData>) {
  const isFolder = node.data.nodeType === 'folder';
  const isOpen = node.isOpen;
  const isSelected = node.isSelected;
  const { onDeleteNode } = useContext(TreeActionsContext);

  const handleClick = useCallback(() => {
    if (isFolder) {
      node.toggle();
    } else {
      node.select();
    }
  }, [node, isFolder]);

  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      node.edit();
    },
    [node],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteNode(node.id);
    },
    [node.id, onDeleteNode],
  );

  return (
    <div
      ref={dragHandle}
      style={style}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isFolder ? isOpen : undefined}
      className={cn(
        'group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm',
        'transition-colors duration-100',
        'hover:bg-surface-hover',
        isSelected && 'bg-surface-active text-text-primary',
        !isSelected && 'text-text-secondary',
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleClick();
        }
        if (e.key === 'F2') {
          node.edit();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          onDeleteNode(node.id);
        }
      }}
    >
      {isFolder ? (
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-200 ease-out',
            isOpen && 'rotate-90',
          )}
          aria-hidden="true"
        />
      ) : (
        <span className="w-3.5" />
      )}
      {!isFolder && (
        <File
          className="size-4 shrink-0 text-text-tertiary transition-colors duration-100"
          aria-hidden="true"
        />
      )}
      {isFolder && isOpen && (
        <FolderOpen
          className="size-4 shrink-0 text-text-tertiary transition-colors duration-100"
          aria-hidden="true"
        />
      )}
      {isFolder && !isOpen && (
        <Folder
          className="size-4 shrink-0 text-text-tertiary transition-colors duration-100"
          aria-hidden="true"
        />
      )}
      {node.isEditing ? (
        <input
          type="text"
          defaultValue={node.data.name}
          ref={(el) => el?.focus()}
          className={cn(
            'min-w-0 flex-1 rounded border border-border-medium bg-surface-primary',
            'px-1.5 py-0.5 text-sm text-text-primary outline-none',
            'transition-shadow duration-150 focus:ring-1 focus:ring-ring-primary',
          )}
          onBlur={() => node.reset()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              node.submit(e.currentTarget.value);
            }
            if (e.key === 'Escape') {
              node.reset();
            }
          }}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">{node.data.name}</span>
          <div
            className={cn(
              'ml-auto flex shrink-0 items-center gap-0.5',
              'translate-x-1 opacity-0 transition-[opacity,transform] duration-150 ease-out',
              'group-hover:translate-x-0 group-hover:opacity-100',
            )}
          >
            <button
              type="button"
              className="rounded p-0.5 text-text-tertiary transition-colors duration-100 hover:bg-surface-tertiary hover:text-text-primary"
              onClick={handleRename}
              aria-label={`Rename ${node.data.name}`}
              tabIndex={-1}
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-text-tertiary transition-colors duration-100 hover:bg-red-500/10 hover:text-red-500"
              onClick={handleDelete}
              aria-label={`Delete ${node.data.name}`}
              tabIndex={-1}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(SkillTreeNode);
export type { SkillTreeData };
