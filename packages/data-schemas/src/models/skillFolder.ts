import skillFolderSchema from '~/schema/skillFolder';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { ISkillFolderDocument } from '~/types/skill';

export function createSkillFolderModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(skillFolderSchema);
  return (
    mongoose.models.SkillFolder ||
    mongoose.model<ISkillFolderDocument>('SkillFolder', skillFolderSchema)
  );
}
