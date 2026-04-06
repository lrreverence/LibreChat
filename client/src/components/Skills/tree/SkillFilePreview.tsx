import { Download } from 'lucide-react';
import { Button } from '@librechat/client';
import { useGetSkillNodeContentQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface SkillFilePreviewProps {
  skillId: string;
  nodeId: string;
  fileName: string;
}

export default function SkillFilePreview({ skillId, nodeId, fileName }: SkillFilePreviewProps) {
  const localize = useLocalize();
  const { data } = useGetSkillNodeContentQuery(skillId, nodeId);

  const isImage = data?.mimeType?.startsWith('image/');
  const downloadUrl = (data as { downloadUrl?: string } | undefined)?.downloadUrl;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-light px-4 py-2">
        <span className="text-sm font-medium text-text-primary">{fileName}</span>
        {downloadUrl && (
          <Button type="button" variant="outline" size="sm" asChild>
            <a
              href={downloadUrl}
              download={fileName}
              aria-label={`${localize('com_ui_download')} ${fileName}`}
            >
              <Download className="mr-1.5 size-3.5" />
              {localize('com_ui_download')}
            </a>
          </Button>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        {isImage && downloadUrl ? (
          <img src={downloadUrl} alt={fileName} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-sm text-text-secondary">
            {fileName} ({data?.mimeType ?? 'unknown type'})
          </p>
        )}
      </div>
    </div>
  );
}
