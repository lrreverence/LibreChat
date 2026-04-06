import { memo } from 'react';
import { FilePlus, FolderPlus, Upload } from 'lucide-react';
import { useLocalize } from '~/hooks';

interface TreeToolbarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
}

function TreeToolbar({ onNewFile, onNewFolder, onUpload }: TreeToolbarProps) {
  const localize = useLocalize();

  return (
    <div
      className="flex items-center gap-1 border-b border-border-light px-2 py-1.5"
      role="toolbar"
      aria-label={localize('com_ui_skill_content')}
    >
      <button
        type="button"
        className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        onClick={onNewFile}
        aria-label={localize('com_ui_skill_new_file')}
        title={localize('com_ui_skill_new_file')}
      >
        <FilePlus className="size-4" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        onClick={onNewFolder}
        aria-label={localize('com_ui_skill_new_folder')}
        title={localize('com_ui_skill_new_folder')}
      >
        <FolderPlus className="size-4" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        onClick={onUpload}
        aria-label={localize('com_ui_skill_upload_file')}
        title={localize('com_ui_skill_upload_file')}
      >
        <Upload className="size-4" />
      </button>
    </div>
  );
}

export default memo(TreeToolbar);
