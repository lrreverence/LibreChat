import React, { useMemo, useState, useCallback } from 'react';
import * as Ariakit from '@ariakit/react';
import { FolderOpen, FolderPlus } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  OGDialog,
  OGDialogTemplate,
  OGDialogTrigger,
  DropdownPopup,
  Button,
  Label,
  Input,
  Spinner,
  useToastContext,
} from '@librechat/client';
import type { MenuItemProps } from '@librechat/client';
import { useListSkillFoldersQuery, useCreateSkillFolderMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface FolderSelectorProps {
  className?: string;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ className = '' }) => {
  const localize = useLocalize();
  const { control, watch, setValue } = useFormContext();
  const { showToast } = useToastContext();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: folders = [] } = useListSkillFoldersQuery({ enabled: true });

  const watchedFolderId = watch('folderId') as string | undefined;

  const selectedFolder = useMemo(
    () => folders.find((f) => f._id === watchedFolderId),
    [folders, watchedFolderId],
  );

  const createFolderMutation = useCreateSkillFolderMutation({
    onSuccess: (newFolder) => {
      setValue('folderId', newFolder._id, { shouldDirty: true });
      setDialogOpen(false);
      setNewFolderName('');
      showToast({ message: localize('com_ui_folder_created'), status: 'success' });
    },
    onError: () => {
      showToast({ message: localize('com_ui_folder_create_error'), status: 'error' });
    },
  });

  const handleCreateFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      return;
    }
    createFolderMutation.mutate({ name: trimmed });
  }, [newFolderName, createFolderMutation]);

  const menuItems: MenuItemProps[] = useMemo(() => {
    const items: MenuItemProps[] = [
      {
        id: '__none__',
        label: localize('com_ui_no_folder'),
        onClick: () => {
          setValue('folderId', undefined, { shouldDirty: true });
          setIsOpen(false);
        },
      },
    ];

    for (const folder of folders) {
      items.push({
        id: folder._id,
        label: folder.name,
        onClick: () => {
          setValue('folderId', folder._id, { shouldDirty: true });
          setIsOpen(false);
        },
      });
    }

    items.push({
      id: '__create__',
      label: localize('com_ui_new_folder'),
      icon: <FolderPlus className="size-4" aria-hidden="true" />,
      onClick: () => {
        setIsOpen(false);
        setDialogOpen(true);
      },
    });

    return items;
  }, [folders, localize, setValue]);

  const trigger = (
    <Ariakit.MenuButton
      className={cn(
        'focus:ring-offset-ring-offset relative inline-flex h-9 items-center justify-between rounded-xl border border-border-medium bg-transparent px-3 text-sm text-text-primary transition-all duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground focus:ring-ring-primary',
        'gap-2 sm:w-fit',
        className,
      )}
      onClick={() => setIsOpen(!isOpen)}
      aria-label={localize('com_ui_folder_selector')}
    >
      <div className="flex items-center space-x-2">
        <FolderOpen className="size-4 text-text-secondary" aria-hidden="true" />
        <span>{selectedFolder ? selectedFolder.name : localize('com_ui_folder')}</span>
      </div>
      <Ariakit.MenuButtonArrow />
    </Ariakit.MenuButton>
  );

  return (
    <>
      <Controller
        name="folderId"
        control={control}
        render={() => (
          <DropdownPopup
            trigger={trigger}
            items={menuItems}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            menuId="folder-selector-menu"
            className="mt-2"
            portal={true}
          />
        )}
      />
      <OGDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <OGDialogTrigger asChild>
          <span />
        </OGDialogTrigger>
        <OGDialogTemplate
          title={localize('com_ui_new_folder')}
          showCloseButton={false}
          className="w-11/12 md:max-w-lg"
          main={
            <div className="space-y-2">
              <Label htmlFor="new-folder-name" className="text-sm font-medium text-text-primary">
                {localize('com_ui_name')}
              </Label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateFolder();
                  }
                }}
                placeholder={localize('com_ui_new_folder')}
                className="w-full"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
          }
          buttons={
            <Button
              type="button"
              variant="submit"
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isLoading || !newFolderName.trim()}
              className="text-white"
              aria-label={localize('com_ui_create')}
            >
              {createFolderMutation.isLoading ? (
                <Spinner className="size-4" />
              ) : (
                localize('com_ui_create')
              )}
            </Button>
          }
        />
      </OGDialog>
    </>
  );
};

export default FolderSelector;
