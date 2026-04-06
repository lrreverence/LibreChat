import { useState, useCallback, useRef } from 'react';
import { Save } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { useGetSkillNodeContentQuery, useUpdateSkillNodeContentMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

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
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between border-b border-border-light px-4 py-2">
        <span className="text-sm font-medium text-text-primary">{fileName}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isDirty || updateContent.isLoading}
          onClick={handleSave}
          aria-label={localize('com_ui_save')}
        >
          <Save className="mr-1.5 size-3.5" />
          {localize('com_ui_save')}
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        value={displayContent}
        onChange={handleChange}
        spellCheck={false}
        className="flex-1 resize-none bg-surface-primary p-4 font-mono text-sm text-text-primary outline-none"
        aria-label={`${localize('com_ui_edit')} ${fileName}`}
      />
    </div>
  );
}
