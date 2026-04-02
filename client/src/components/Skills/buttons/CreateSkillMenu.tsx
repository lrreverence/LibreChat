import { useRef, useCallback } from 'react';
import { Plus, PenLine, Upload, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  TooltipAnchor,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  useToastContext,
} from '@librechat/client';
import type { ParsedSkillMd } from '../utils/parseSkillMd';
import { parseSkillMd } from '../utils/parseSkillMd';
import { useLocalize } from '~/hooks';

export default function CreateSkillMenu() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManual = useCallback(() => {
    navigate('/skills/new');
  }, [navigate]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          return;
        }
        const parsed: ParsedSkillMd = parseSkillMd(text);
        navigate('/skills/new', { state: { uploadData: parsed } });
      };
      reader.onerror = () => {
        showToast({
          status: 'error',
          message: localize('com_ui_create_skill_upload_error'),
        });
      };
      reader.readAsText(file);

      event.target.value = '';
    },
    [navigate, showToast, localize],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 bg-transparent"
            aria-label={localize('com_ui_create_skill')}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <TooltipAnchor
            description={localize('com_ui_create_skill_ai_coming_soon')}
            side="left"
            render={
              <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                <Sparkles className="size-4" aria-hidden="true" />
                {localize('com_ui_create_skill_ai')}
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem onSelect={handleManual}>
            <PenLine className="size-4" aria-hidden="true" />
            {localize('com_ui_create_skill_manual')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleUploadClick}>
            <Upload className="size-4" aria-hidden="true" />
            {localize('com_ui_create_skill_upload')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        aria-hidden="true"
        onChange={handleFileChange}
      />
    </>
  );
}
