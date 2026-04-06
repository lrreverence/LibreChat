import { memo, useCallback } from 'react';
import { File, Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { cn } from '~/utils';
import type { NodeRendererProps } from 'react-arborist';

interface SkillTreeData {
  id: string;
  name: string;
  nodeType: 'file' | 'folder';
  fileId?: string;
  children?: SkillTreeData[];
}

function SkillTreeNode({ node, style, dragHandle }: NodeRendererProps<SkillTreeData>) {
  const isFolder = node.data.nodeType === 'folder';
  const isOpen = node.isOpen;
  const isSelected = node.isSelected;

  const handleClick = useCallback(() => {
    if (isFolder) {
      node.toggle();
    } else {
      node.select();
    }
  }, [node, isFolder]);

  return (
    <div
      ref={dragHandle}
      style={style}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isFolder ? isOpen : undefined}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm',
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
      }}
    >
      {isFolder && (
        <ChevronRight
          className={cn('size-3.5 shrink-0 transition-transform', isOpen && 'rotate-90')}
          aria-hidden="true"
        />
      )}
      {!isFolder && <span className="w-3.5" />}
      {!isFolder && <File className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />}
      {isFolder && isOpen && (
        <FolderOpen className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
      )}
      {isFolder && !isOpen && (
        <Folder className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
      )}
      {node.isEditing ? (
        <input
          type="text"
          defaultValue={node.data.name}
          ref={(el) => el?.focus()}
          className="min-w-0 flex-1 rounded border border-border-medium bg-surface-primary px-1 py-0 text-sm text-text-primary outline-none"
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
        <span className="truncate">{node.data.name}</span>
      )}
    </div>
  );
}

export default memo(SkillTreeNode);
export type { SkillTreeData };
