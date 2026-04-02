import { useState, useMemo } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import type { AgentForm } from '~/common';
import { useListSkillsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface SkillSelectDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function SkillSelectDialog({ isOpen, setIsOpen }: SkillSelectDialogProps) {
  const localize = useLocalize();
  const { getValues, setValue } = useFormContext<AgentForm>();
  const [searchValue, setSearchValue] = useState('');
  const { data: skillsData } = useListSkillsQuery({ pageSize: '100' });

  const filteredSkills = useMemo(() => {
    const skills = skillsData?.skills ?? [];
    if (!searchValue) {
      return skills;
    }
    const lower = searchValue.toLowerCase();
    return skills.filter((s) => s.name.toLowerCase().includes(lower));
  }, [skillsData?.skills, searchValue]);

  const handleToggleSkill = (skillId: string) => {
    const currentSkills: string[] = getValues('skills') ?? [];
    if (currentSkills.includes(skillId)) {
      setValue(
        'skills',
        currentSkills.filter((id) => id !== skillId),
      );
    } else {
      setValue('skills', [...currentSkills, skillId]);
    }
  };

  const isAttached = (skillId: string): boolean => {
    const currentSkills: string[] = getValues('skills') ?? [];
    return currentSkills.includes(skillId);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchValue('');
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-[102]">
      <div className="fixed inset-0 bg-surface-primary opacity-60 transition-opacity dark:opacity-80" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative max-h-[90vh] w-full transform overflow-hidden overflow-y-auto rounded-lg bg-surface-secondary text-left shadow-xl transition-all max-sm:h-full sm:mx-7 sm:my-8 sm:max-w-2xl lg:max-w-3xl">
          <div className="flex items-center justify-between border-b-[1px] border-border-medium px-4 pb-4 pt-5 sm:p-6">
            <div className="flex items-center">
              <div className="text-center sm:text-left">
                <DialogTitle className="text-lg font-medium leading-6 text-text-primary">
                  {localize('com_ui_add_skills')}
                </DialogTitle>
                <Description className="text-sm text-text-secondary">
                  {localize('com_ui_select_skills_description')}
                </Description>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="inline-block rounded-full text-text-secondary transition-colors hover:text-text-primary"
              aria-label={localize('com_ui_close')}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="p-4 sm:p-6 sm:pt-4">
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-center space-x-4">
                <Search className="h-6 w-6 text-text-tertiary" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={localize('com_ui_search_skills')}
                  className="w-64 rounded border border-border-medium bg-transparent px-2 py-1 text-text-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSkills.map((skill) => {
                  const attached = isAttached(skill._id);
                  return (
                    <div
                      key={skill._id}
                      className="flex items-start justify-between rounded-lg border border-border-medium p-3 transition-colors hover:bg-surface-tertiary"
                    >
                      <div className="mr-2 min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {skill.name}
                        </p>
                        {skill.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                            {skill.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSkill(skill._id)}
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                          attached
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
                        }`}
                        aria-label={
                          attached
                            ? localize('com_ui_remove')
                            : localize('com_ui_add')
                        }
                      >
                        {attached ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  );
                })}
                {filteredSkills.length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-text-secondary">
                    {localize('com_ui_no_skills_found')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default SkillSelectDialog;
