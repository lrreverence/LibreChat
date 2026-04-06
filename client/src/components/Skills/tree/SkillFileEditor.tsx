import { useState, useCallback, useRef } from 'react';
import { Save, FileText, Circle } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { useGetSkillNodeContentQuery, useUpdateSkillNodeContentMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface SkillFileEditorProps {
  skillId: string;
  nodeId: string;
  fileName: string;
}

export default function SkillFileEditor({ skillId, nodeId, fileName }: SkillFileEditorProps) {
  const localize = useLocalize();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading } = useGetSkillNodeContentQuery(skillId, nodeId);
  const updateContent = useUpdateSkillNodeContentMutation(skillId);

  const serverContent = data?.content ?? '';
  const displayContent = localContent ?? serverContent;

  const prevNodeIdRef = useRef(nodeId);
  if (prevNodeIdRef.current !== nodeId) {
    prevNodeIdRef.current = nodeId;
    setLocalContent(null);
    setIsDirty(false);
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalContent(newValue);
      setIsDirty(newValue !== serverContent);
    },
    [serverContent],
  );

  const handleSave = useCallback(() => {
    if (!isDirty || localContent === null) {
      return;
    }
    updateContent.mutate(
      { skillId, nodeId, content: localContent },
      {
        onSuccess: () => {
          setIsDirty(false);
        },
      },
    );
  }, [skillId, nodeId, localContent, isDirty, updateContent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-primary">
        <Spinner className="text-text-tertiary" />
      </div>
    );
  }

  const lineCount = displayContent.split('\n').length;
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();

  return (
    <div className="flex h-full flex-col bg-surface-primary" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-2 border-b border-border-light px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-text-primary">{fileName}</span>
          <Circle
            className={cn(
              'size-2 shrink-0 transition-[opacity,color] duration-200',
              isDirty ? 'fill-current text-yellow-500 opacity-100' : 'opacity-0',
            )}
            aria-hidden="true"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ext && (
            <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {ext}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty || updateContent.isLoading}
            onClick={handleSave}
            aria-label={localize('com_ui_save')}
            className={cn(
              'h-7 gap-1.5 px-2.5 text-xs transition-all duration-150',
              isDirty && 'border-green-600/30 bg-green-600/5 text-green-600 hover:bg-green-600/10',
            )}
          >
            <Save className="size-3" />
            {localize('com_ui_save')}
          </Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={displayContent}
          onChange={handleChange}
          spellCheck={false}
          className={cn(
            'size-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-text-primary outline-none',
            'selection:bg-blue-500/20',
          )}
          aria-label={`${localize('com_ui_edit')} ${fileName}`}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border-light px-4 py-1">
        <span className="text-[11px] text-text-tertiary">
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>
        <span className="text-[11px] text-text-tertiary">{isDirty ? 'Modified' : 'Saved'}</span>
      </div>
    </div>
  );
}
