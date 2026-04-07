import { memo, useCallback, useState, useEffect, useRef } from 'react';
import {
  FileText,
  FileCode,
  FileJson,
  FileImage,
  Folder,
  FolderOpen,
  ChevronRight,
  Pencil,
  Trash,
} from 'lucide-react';
import { OGDialog, OGDialogTrigger, OGDialogTemplate } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { SkillTreeData } from './SkillFileTree';

const CODE_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.sh',
  '.css',
  '.html',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
]);
const JSON_EXTENSIONS = new Set(['.json', '.jsonl']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);

function getFileIcon(name: string) {
  const lower = name.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf('.'));
  if (CODE_EXTENSIONS.has(ext)) {
    return FileCode;
  }
  if (JSON_EXTENSIONS.has(ext)) {
    return FileJson;
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return FileImage;
  }
  return FileText;
}

interface SkillTreeRowProps {
  node: SkillTreeData;
  depth: number;
  isOpen: boolean;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string, type: 'file' | 'folder') => void;
  onToggle: (id: string) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onSubmitRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

function SkillTreeRow({
  node,
  depth,
  isOpen,
  isSelected,
  isEditing,
  onSelect,
  onToggle,
  onStartEdit,
  onStopEdit,
  onSubmitRename,
  onDelete,
}: SkillTreeRowProps) {
  const localize = useLocalize();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFolder = node.nodeType === 'folder';
  const FileIcon = !isFolder ? getFileIcon(node.name) : null;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    if (isFolder) {
      onToggle(node.id);
    } else {
      onSelect(node.id, 'file');
    }
  }, [isFolder, node.id, onToggle, onSelect]);

  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStartEdit(node.id);
    },
    [node.id, onStartEdit],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        onDelete(node.id);
        return;
      }
      setDeleteOpen(true);
    },
    [node.id, onDelete],
  );

  const handleDeleteConfirm = useCallback(() => {
    onDelete(node.id);
    setDeleteOpen(false);
  }, [node.id, onDelete]);

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isFolder ? isOpen : undefined}
      className={cn(
        'group flex cursor-pointer items-center gap-1.5 rounded-lg py-1 pl-2 pr-1 text-sm',
        isSelected
          ? 'bg-surface-active text-text-primary'
          : 'text-text-secondary hover:bg-surface-hover',
      )}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleClick();
        }
        if (e.key === 'F2') {
          onStartEdit(node.id);
        }
      }}
      tabIndex={0}
    >
      {isFolder ? (
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-text-secondary',
            'ease-[cubic-bezier(0.32,0.72,0,1)] transition-transform duration-300',
            isOpen && 'rotate-90',
          )}
          aria-hidden="true"
        />
      ) : (
        <span className="w-3.5" />
      )}
      {isFolder && (
        <span className="relative size-4 shrink-0">
          <FolderOpen
            className={cn(
              'absolute inset-0 size-4 text-text-secondary',
              'ease-[cubic-bezier(0.32,0.72,0,1)] transition-opacity duration-300',
              isOpen ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden="true"
          />
          <Folder
            className={cn(
              'absolute inset-0 size-4 text-text-secondary',
              'ease-[cubic-bezier(0.32,0.72,0,1)] transition-opacity duration-300',
              isOpen ? 'opacity-0' : 'opacity-100',
            )}
            aria-hidden="true"
          />
        </span>
      )}
      {FileIcon && <FileIcon className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={node.name}
          className="min-w-0 flex-1 rounded-md border-none bg-transparent py-0 pl-0 text-sm text-text-primary outline-none ring-1 ring-border-medium focus:ring-ring-primary"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => onSubmitRename(node.id, e.currentTarget.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              onSubmitRename(node.id, e.currentTarget.value);
            }
            if (e.key === 'Escape') {
              onStopEdit();
            }
          }}
        />
      ) : (
        <>
          <span className={cn('min-w-0 flex-1 truncate', isSelected && 'font-medium')}>
            {node.name}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-px opacity-0 group-hover:opacity-100">
            <button
              type="button"
              className="rounded p-1 text-text-secondary transition-colors duration-100 hover:bg-surface-tertiary hover:text-text-primary"
              onClick={handleRename}
              aria-label={`Rename ${node.name}`}
              tabIndex={-1}
            >
              <Pencil className="size-3.5" />
            </button>
            <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <OGDialogTrigger asChild>
                <button
                  type="button"
                  className="rounded p-1 text-text-secondary transition-colors duration-100 hover:bg-surface-tertiary hover:text-text-primary"
                  onClick={handleDeleteClick}
                  aria-label={`Delete ${node.name}`}
                  tabIndex={-1}
                >
                  <Trash className="size-3.5" />
                </button>
              </OGDialogTrigger>
              <OGDialogTemplate
                showCloseButton={false}
                title={localize('com_ui_delete')}
                className="max-w-[450px]"
                main={
                  <p className="text-left text-sm text-text-primary">
                    {isFolder
                      ? `Delete folder "${node.name}" and all its contents?`
                      : `Delete "${node.name}"?`}
                  </p>
                }
                selection={{
                  selectHandler: handleDeleteConfirm,
                  selectClasses:
                    'bg-surface-destructive hover:bg-surface-destructive-hover transition-colors duration-200 text-white',
                  selectText: localize('com_ui_delete'),
                }}
              />
            </OGDialog>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(SkillTreeRow);
