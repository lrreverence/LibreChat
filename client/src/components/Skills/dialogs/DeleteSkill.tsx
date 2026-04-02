import React, { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  OGDialog,
  OGDialogTrigger,
  TooltipAnchor,
  OGDialogTemplate,
} from '@librechat/client';
import { useDeleteSkillMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

const DeleteConfirmDialog = ({
  name,
  disabled,
  selectHandler,
}: {
  name: string;
  disabled?: boolean;
  selectHandler: () => void;
}) => {
  const localize = useLocalize();

  return (
    <OGDialog>
      <OGDialogTrigger asChild>
        <TooltipAnchor
          description={localize('com_ui_delete')}
          side="bottom"
          render={
            <Button
              variant="destructive"
              size="icon"
              className="size-9"
              aria-label={localize('com_ui_delete')}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </Button>
          }
        />
      </OGDialogTrigger>
      <OGDialogTemplate
        showCloseButton={false}
        title={localize('com_ui_delete_skill')}
        className="max-w-[450px]"
        main={
          <div className="flex w-full flex-col items-center gap-2">
            <div className="grid w-full items-center gap-2">
              <p className="text-left text-sm text-text-primary">
                {localize('com_ui_delete_skill_confirm_var', { 0: name })}
              </p>
            </div>
          </div>
        }
        selection={{
          selectHandler,
          selectClasses:
            'bg-surface-destructive hover:bg-surface-destructive-hover transition-colors duration-200 text-white',
          selectText: localize('com_ui_delete'),
        }}
      />
    </OGDialog>
  );
};

interface DeleteSkillProps {
  skillId: string;
  skillName: string;
  disabled?: boolean;
  onDelete?: () => void;
}

const DeleteSkill = React.memo(
  ({ skillId, skillName, disabled, onDelete }: DeleteSkillProps) => {
    const deleteSkillMutation = useDeleteSkillMutation();

    const handleDelete = useCallback(() => {
      deleteSkillMutation.mutate(
        { _id: skillId },
        { onSuccess: () => onDelete?.() },
      );
    }, [skillId, deleteSkillMutation, onDelete]);

    return (
      <DeleteConfirmDialog
        name={skillName}
        disabled={disabled}
        selectHandler={handleDelete}
      />
    );
  },
);

DeleteSkill.displayName = 'DeleteSkill';

export default DeleteSkill;
