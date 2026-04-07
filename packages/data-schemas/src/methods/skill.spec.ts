import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ResourceType } from 'librechat-data-provider';
import type { Model, Types } from 'mongoose';
import type { ISkillDocument, IAclEntry } from '~/types';
import { createSkillMethods, type SkillMethods } from './skill';
import { createModels } from '~/models';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let mongoServer: MongoMemoryServer;
let Skill: Model<ISkillDocument>;
let AclEntry: Model<IAclEntry>;
let methods: SkillMethods;

const authorId = new mongoose.Types.ObjectId();
const authorId2 = new mongoose.Types.ObjectId();

const mockRemoveAllPermissions = jest.fn().mockResolvedValue(undefined);
const mockGetSoleOwnedResourceIds = jest.fn().mockResolvedValue([] as Types.ObjectId[]);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  createModels(mongoose);
  Skill = mongoose.models.Skill as Model<ISkillDocument>;
  AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;

  methods = createSkillMethods(mongoose, {
    removeAllPermissions: mockRemoveAllPermissions,
    getSoleOwnedResourceIds: mockGetSoleOwnedResourceIds,
  });

  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  jest.clearAllMocks();
});

function makeSkill(overrides: Partial<ISkillDocument> = {}) {
  return {
    name: 'Test Skill',
    description: 'A test skill',
    invocationMode: 'auto' as const,
    author: authorId,
    authorName: 'Test User',
    ...overrides,
  };
}

describe('createSkill', () => {
  it('should create a skill and return a lean document', async () => {
    const skill = await methods.createSkill(makeSkill());

    expect(skill).toBeDefined();
    expect(skill!.name).toBe('Test Skill');
    expect(skill!.description).toBe('A test skill');
    expect(skill!.invocationMode).toBe('auto');
    expect(skill!.author.toString()).toBe(authorId.toString());
    expect(skill!.authorName).toBe('Test User');
    expect(skill!.isPublic).toBe(false);
    expect(skill!.createdAt).toBeDefined();
    expect(skill!.updatedAt).toBeDefined();
  });

  it('should default invocationMode to auto', async () => {
    const data = makeSkill();
    delete (data as Record<string, unknown>).invocationMode;
    const skill = await methods.createSkill(data);
    expect(skill!.invocationMode).toBe('auto');
  });

  it('should reject a skill without name', async () => {
    const data = makeSkill({ name: undefined as unknown as string });
    await expect(methods.createSkill(data)).rejects.toThrow();
  });

  it('should reject a skill without author', async () => {
    const data = makeSkill({ author: undefined as unknown as Types.ObjectId });
    await expect(methods.createSkill(data)).rejects.toThrow();
  });

  it('should store optional category', async () => {
    const skill = await methods.createSkill(makeSkill({ category: 'code' }));
    expect(skill!.category).toBe('code');
  });

  it('should store isPublic when set', async () => {
    const skill = await methods.createSkill(makeSkill({ isPublic: true }));
    expect(skill!.isPublic).toBe(true);
  });
});

describe('getSkillById', () => {
  it('should retrieve an existing skill', async () => {
    const created = await methods.createSkill(makeSkill());
    const found = await methods.getSkillById({ _id: created!._id.toString() });
    expect(found).toBeDefined();
    expect(found!.name).toBe('Test Skill');
  });

  it('should return null for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const found = await methods.getSkillById({ _id: fakeId });
    expect(found).toBeNull();
  });
});

describe('updateSkill', () => {
  it('should update skill fields and return the updated document', async () => {
    const created = await methods.createSkill(makeSkill());
    const updated = await methods.updateSkill({
      _id: created!._id.toString(),
      data: { name: 'Updated Name', description: 'Updated description' },
    });
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.description).toBe('Updated description');
  });

  it('should return null for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await methods.updateSkill({ _id: fakeId, data: { name: 'x' } });
    expect(result).toBeNull();
  });

  it('should update invocationMode', async () => {
    const created = await methods.createSkill(makeSkill());
    const updated = await methods.updateSkill({
      _id: created!._id.toString(),
      data: { invocationMode: 'manual' },
    });
    expect(updated!.invocationMode).toBe('manual');
  });
});

describe('deleteSkill', () => {
  it('should delete an existing skill and call removeAllPermissions', async () => {
    const created = await methods.createSkill(makeSkill());
    const result = await methods.deleteSkill({ _id: created!._id.toString() });
    expect(result.message).toBe('Skill deleted successfully');
    expect(mockRemoveAllPermissions).toHaveBeenCalledWith({
      resourceType: ResourceType.SKILL,
      resourceId: created!._id.toString(),
    });
    const found = await Skill.findById(created!._id);
    expect(found).toBeNull();
  });

  it('should throw for non-existent skill', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(methods.deleteSkill({ _id: fakeId })).rejects.toThrow('Skill not found');
  });

  it('should still succeed if removeAllPermissions fails', async () => {
    mockRemoveAllPermissions.mockRejectedValueOnce(new Error('perm error'));
    const created = await methods.createSkill(makeSkill());
    const result = await methods.deleteSkill({ _id: created!._id.toString() });
    expect(result.message).toBe('Skill deleted successfully');
  });
});

describe('getListSkillsByAccess', () => {
  it('should return only accessible skills', async () => {
    const s1 = await methods.createSkill(makeSkill({ name: 'Accessible' }));
    await methods.createSkill(makeSkill({ name: 'Inaccessible', author: authorId2 }));

    const result = await methods.getListSkillsByAccess({
      accessibleIds: [s1!._id as Types.ObjectId],
    });

    expect(result.object).toBe('list');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Accessible');
  });

  it('should return empty list when no IDs are accessible', async () => {
    await methods.createSkill(makeSkill());
    const result = await methods.getListSkillsByAccess({ accessibleIds: [] });
    expect(result.data).toHaveLength(0);
    expect(result.has_more).toBe(false);
  });

  it('should support cursor pagination', async () => {
    const ids: Types.ObjectId[] = [];
    for (let i = 0; i < 5; i++) {
      const s = await methods.createSkill(makeSkill({ name: `Skill ${i}` }));
      ids.push(s!._id as Types.ObjectId);
    }

    const page1 = await methods.getListSkillsByAccess({ accessibleIds: ids, limit: 3 });
    expect(page1.data).toHaveLength(3);
    expect(page1.has_more).toBe(true);
    expect(page1.after).toBeTruthy();

    const page2 = await methods.getListSkillsByAccess({
      accessibleIds: ids,
      limit: 3,
      after: page1.after,
    });
    expect(page2.data).toHaveLength(2);
    expect(page2.has_more).toBe(false);
  });

  it('should filter by name search', async () => {
    const s1 = await methods.createSkill(makeSkill({ name: 'Alpha Skill' }));
    const s2 = await methods.createSkill(makeSkill({ name: 'Beta Skill' }));
    const ids = [s1!._id, s2!._id] as Types.ObjectId[];

    const result = await methods.getListSkillsByAccess({
      accessibleIds: ids,
      otherParams: { name: /alpha/i },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alpha Skill');
  });

  it('should filter by category', async () => {
    const s1 = await methods.createSkill(makeSkill({ name: 'In Category', category: 'code' }));
    const s2 = await methods.createSkill(makeSkill({ name: 'No Category' }));
    const ids = [s1!._id, s2!._id] as Types.ObjectId[];

    const result = await methods.getListSkillsByAccess({
      accessibleIds: ids,
      otherParams: { category: 'code' },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('In Category');
  });

  it('should handle invalid cursor gracefully', async () => {
    const s = await methods.createSkill(makeSkill());
    const result = await methods.getListSkillsByAccess({
      accessibleIds: [s!._id as Types.ObjectId],
      limit: 10,
      after: 'not-valid-base64!!',
    });
    expect(result.data).toHaveLength(1);
  });

  it('should convert author ObjectId to string', async () => {
    const s = await methods.createSkill(makeSkill());
    const result = await methods.getListSkillsByAccess({
      accessibleIds: [s!._id as Types.ObjectId],
    });
    expect(typeof result.data[0].author).toBe('string');
  });

  it('should populate first_id and last_id', async () => {
    const s = await methods.createSkill(makeSkill());
    const result = await methods.getListSkillsByAccess({
      accessibleIds: [s!._id as Types.ObjectId],
    });
    expect(result.first_id).toBe(s!._id.toString());
    expect(result.last_id).toBe(s!._id.toString());
  });

  it('should cap limit at 100', async () => {
    const s = await methods.createSkill(makeSkill());
    const result = await methods.getListSkillsByAccess({
      accessibleIds: [s!._id as Types.ObjectId],
      limit: 999,
    });
    expect(result.data).toHaveLength(1);
  });
});

describe('deleteUserSkills', () => {
  it('should delete sole-owned skills', async () => {
    const skill = await methods.createSkill(makeSkill());

    mockGetSoleOwnedResourceIds.mockResolvedValueOnce([skill!._id]);

    await methods.deleteUserSkills(authorId.toString());

    const skills = await Skill.find({}).lean();
    expect(skills).toHaveLength(0);
  });

  it('should delete legacy (pre-ACL) skills without ACL entries', async () => {
    const skill = await methods.createSkill(makeSkill());
    mockGetSoleOwnedResourceIds.mockResolvedValueOnce([]);

    await methods.deleteUserSkills(authorId.toString());

    const remaining = await Skill.findById(skill!._id);
    expect(remaining).toBeNull();
  });

  it('should not delete skills that have ACL entries but are not sole-owned', async () => {
    const skill = await methods.createSkill(makeSkill());
    await AclEntry.create({
      principalType: 'user',
      principalId: authorId,
      principalModel: 'User',
      resourceType: ResourceType.SKILL,
      resourceId: skill!._id,
      permBits: 1,
      grantedBy: authorId,
      grantedAt: new Date(),
    });

    mockGetSoleOwnedResourceIds.mockResolvedValueOnce([]);

    await methods.deleteUserSkills(authorId.toString());

    const remaining = await Skill.findById(skill!._id);
    expect(remaining).toBeDefined();
  });

  it('should handle user with no skills gracefully', async () => {
    mockGetSoleOwnedResourceIds.mockResolvedValueOnce([]);
    await expect(methods.deleteUserSkills(authorId.toString())).resolves.toBeUndefined();
  });
});
