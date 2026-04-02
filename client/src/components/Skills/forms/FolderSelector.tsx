import React, { useMemo, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { FolderOpen } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { DropdownPopup } from '@librechat/client';
import type { MenuItemProps } from '@librechat/client';
import { useListSkillFoldersQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface FolderSelectorProps {
  className?: string;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ className = '' }) => {
  const localize = useLocalize();
  const { control, watch, setValue } = useFormContext();
  const [isOpen, setIsOpen] = useState(false);

  const { data: folders = [] } = useListSkillFoldersQuery({ enabled: true });

  const watchedFolderId = watch('folderId') as string | undefined;

  const selectedFolder = useMemo(
    () => folders.find((f) => f._id === watchedFolderId),
    [folders, watchedFolderId],
  );

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
  );
};

export default FolderSelector;
