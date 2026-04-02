import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks';
import SkillsSidePanel from './SkillsSidePanel';

export default function SkillsAccordion() {
  const { user } = useAuthContext();
  return (
    <div className="flex h-auto w-full flex-col px-3 pb-3">
      <SkillsSidePanel className="h-auto space-y-2 md:mr-0 md:min-w-0 lg:w-full xl:w-full">
        {user?.role === SystemRoles.ADMIN && (
          <div data-testid="skills-admin-settings" />
        )}
      </SkillsSidePanel>
    </div>
  );
}
