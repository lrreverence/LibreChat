import skillNodeSchema from '~/schema/skillNode';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { ISkillNodeDocument } from '~/types/skillNode';

export function createSkillNodeModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(skillNodeSchema);
  return (
    mongoose.models.SkillNode || mongoose.model<ISkillNodeDocument>('SkillNode', skillNodeSchema)
  );
}
