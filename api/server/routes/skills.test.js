const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  SystemRoles,
  ResourceType,
  AccessRoleIds,
  _PrincipalType,
  PermissionBits,
} = require('librechat-data-provider');

jest.mock('~/models', () => {
  const mongoose = require('mongoose');
  const { createMethods } = require('@librechat/data-schemas');
  const methods = createMethods(mongoose, {
    removeAllPermissions: async ({ resourceType, resourceId }) => {
      const AclEntry = mongoose.models.AclEntry;
      if (AclEntry) {
        await AclEntry.deleteMany({ resourceType, resourceId });
      }
    },
  });
  return {
    ...methods,
  };
});

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, res, next) => next(),
  canAccessSkillResource: jest.requireActual('~/server/middleware').canAccessSkillResource,
}));

let app;
let mongoServer;
let Skill, SkillFolder, AclEntry, AccessRole, User, Role;
let testUsers, _testRoles;
let _grantPermission;
let currentTestUser;

function setTestUser(user) {
  currentTestUser = user;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const dbModels = require('~/db/models');
  Skill = dbModels.Skill;
  SkillFolder = dbModels.SkillFolder;
  AclEntry = dbModels.AclEntry;
  AccessRole = dbModels.AccessRole;
  User = dbModels.User;
  Role = dbModels.Role;

  const permissionService = require('~/server/services/PermissionService');
  _grantPermission = permissionService.grantPermission;

  await setupTestData();

  app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (currentTestUser) {
      req.user = {
        ...(currentTestUser.toObject ? currentTestUser.toObject() : currentTestUser),
        id: currentTestUser._id.toString(),
        _id: currentTestUser._id,
        name: currentTestUser.name,
        role: currentTestUser.role,
      };
    }
    next();
  });

  currentTestUser = testUsers.owner;

  const skillRoutes = require('./skills');
  app.use('/api/skills', skillRoutes);
});

afterEach(async () => {
  currentTestUser = testUsers.owner;
  await Skill.deleteMany({});
  await SkillFolder.deleteMany({});
  await AclEntry.deleteMany({ resourceType: ResourceType.SKILL });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  jest.clearAllMocks();
});

async function setupTestData() {
  _testRoles = {
    viewer: await AccessRole.create({
      accessRoleId: AccessRoleIds.SKILL_VIEWER,
      name: 'Viewer',
      resourceType: ResourceType.SKILL,
      permBits: PermissionBits.VIEW,
    }),
    editor: await AccessRole.create({
      accessRoleId: AccessRoleIds.SKILL_EDITOR,
      name: 'Editor',
      resourceType: ResourceType.SKILL,
      permBits: PermissionBits.VIEW | PermissionBits.EDIT,
    }),
    owner: await AccessRole.create({
      accessRoleId: AccessRoleIds.SKILL_OWNER,
      name: 'Owner',
      resourceType: ResourceType.SKILL,
      permBits:
        PermissionBits.VIEW | PermissionBits.EDIT | PermissionBits.DELETE | PermissionBits.SHARE,
    }),
  };

  testUsers = {
    owner: await User.create({
      name: 'Skill Owner',
      email: 'skillowner@example.com',
      role: SystemRoles.USER,
    }),
    viewer: await User.create({
      name: 'Skill Viewer',
      email: 'skillviewer@example.com',
      role: SystemRoles.USER,
    }),
    noAccess: await User.create({
      name: 'No Access',
      email: 'noaccess@example.com',
      role: SystemRoles.USER,
    }),
  };

  // Seed role with SKILLS permissions so generateCheckAccess passes
  await Role.create({
    name: SystemRoles.USER,
    permissions: {
      SKILLS: { USE: true, CREATE: true, SHARE: true, SHARE_PUBLIC: false },
    },
  });
}

async function createSkillAsOwner(overrides = {}) {
  const res = await request(app)
    .post('/api/skills')
    .send({
      name: 'Test Skill',
      description: 'A test skill',
      invocationMode: 'auto',
      ...overrides,
    });
  return res;
}

describe('POST /api/skills', () => {
  it('should create a skill and return 201', async () => {
    const res = await createSkillAsOwner();
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Skill');
    expect(res.body.author).toBe(testUsers.owner._id.toString());
  });

  it('should reject missing name with 400', async () => {
    const res = await request(app).post('/api/skills').send({ description: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('should reject empty name string with 400', async () => {
    const res = await request(app).post('/api/skills').send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('should not allow mass assignment of author', async () => {
    const attackerId = new ObjectId();
    const res = await createSkillAsOwner({ author: attackerId.toString() });
    expect(res.status).toBe(201);
    expect(res.body.author).toBe(testUsers.owner._id.toString());
    expect(res.body.author).not.toBe(attackerId.toString());
  });

  it('should not allow mass assignment of isPublic', async () => {
    const res = await createSkillAsOwner({ isPublic: true });
    expect(res.status).toBe(201);
    expect(res.body.isPublic).toBeFalsy();
  });

  it('should not allow mass assignment of tenantId', async () => {
    const res = await createSkillAsOwner({ tenantId: 'evil-tenant' });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBeUndefined();
  });

  it('should grant OWNER ACL to creator', async () => {
    const res = await createSkillAsOwner();
    expect(res.status).toBe(201);

    const entries = await AclEntry.find({
      resourceType: ResourceType.SKILL,
      resourceId: res.body._id,
    }).lean();
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/skills', () => {
  it('should return owned skills in the list', async () => {
    const create = await createSkillAsOwner();
    expect(create.status).toBe(201);

    const res = await request(app).get('/api/skills');
    expect(res.status).toBe(200);
    expect(res.body.object).toBe('list');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty list when user has no accessible skills', async () => {
    setTestUser(testUsers.noAccess);
    const res = await request(app).get('/api/skills');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('should support search parameter', async () => {
    await createSkillAsOwner({ name: 'Alpha Search' });
    await createSkillAsOwner({ name: 'Beta Search' });

    const res = await request(app).get('/api/skills?search=alpha');
    expect(res.status).toBe(200);
    const names = res.body.data.map((s) => s.name);
    expect(names).toContain('Alpha Search');
    expect(names).not.toContain('Beta Search');
  });

  it('should support limit parameter for pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await createSkillAsOwner({ name: `Paged ${i}` });
    }
    const res = await request(app).get('/api/skills?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
    expect(res.body.has_more).toBe(true);
    expect(res.body.after).toBeTruthy();
  });
});

describe('GET /api/skills/:skillId', () => {
  it('should return a skill the user owns', async () => {
    const create = await createSkillAsOwner();
    const skillId = create.body._id;

    const res = await request(app).get(`/api/skills/${skillId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Skill');
  });

  it('should return 403 for a skill the user cannot access', async () => {
    const create = await createSkillAsOwner();
    const skillId = create.body._id;

    setTestUser(testUsers.noAccess);
    const res = await request(app).get(`/api/skills/${skillId}`);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/skills/:skillId', () => {
  it('should update an owned skill', async () => {
    const create = await createSkillAsOwner();
    const skillId = create.body._id;

    const res = await request(app).patch(`/api/skills/${skillId}`).send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('should not allow mass assignment of author via update', async () => {
    const create = await createSkillAsOwner();
    const attackerId = new ObjectId().toString();

    const res = await request(app)
      .patch(`/api/skills/${create.body._id}`)
      .send({ author: attackerId, name: 'X' });
    expect(res.status).toBe(200);
    expect(res.body.author).toBe(testUsers.owner._id.toString());
  });

  it('should return 403 for skill not owned', async () => {
    const create = await createSkillAsOwner();
    setTestUser(testUsers.noAccess);

    const res = await request(app).patch(`/api/skills/${create.body._id}`).send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/skills/:skillId', () => {
  it('should delete an owned skill', async () => {
    const create = await createSkillAsOwner();
    const skillId = create.body._id;

    const res = await request(app).delete(`/api/skills/${skillId}`);
    expect(res.status).toBe(200);

    const gone = await Skill.findById(skillId);
    expect(gone).toBeNull();
  });

  it('should return 403 for skill not owned', async () => {
    const create = await createSkillAsOwner();
    setTestUser(testUsers.noAccess);

    const res = await request(app).delete(`/api/skills/${create.body._id}`);
    expect(res.status).toBe(403);
  });
});

describe('Folder routes', () => {
  describe('GET /api/skills/folders', () => {
    it('should return only the current user folders', async () => {
      await SkillFolder.create({ name: 'Mine', author: testUsers.owner._id });
      await SkillFolder.create({ name: 'Other', author: testUsers.viewer._id });

      const res = await request(app).get('/api/skills/folders');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Mine');
    });
  });

  describe('POST /api/skills/folders', () => {
    it('should create a folder', async () => {
      const res = await request(app).post('/api/skills/folders').send({ name: 'New Folder' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Folder');
      expect(res.body.author).toBe(testUsers.owner._id.toString());
    });

    it('should reject empty name', async () => {
      const res = await request(app).post('/api/skills/folders').send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/skills/folders/:folderId', () => {
    it('should rename an owned folder', async () => {
      const folder = await SkillFolder.create({ name: 'Old', author: testUsers.owner._id });
      const res = await request(app)
        .patch(`/api/skills/folders/${folder._id}`)
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Renamed');
    });

    it('should return 404 for folder owned by another user', async () => {
      const folder = await SkillFolder.create({ name: 'Other', author: testUsers.viewer._id });
      const res = await request(app)
        .patch(`/api/skills/folders/${folder._id}`)
        .send({ name: 'Stolen' });
      expect(res.status).toBe(404);

      const unchanged = await SkillFolder.findById(folder._id).lean();
      expect(unchanged.name).toBe('Other');
    });

    it('should return 404 for invalid ObjectId', async () => {
      const res = await request(app)
        .patch('/api/skills/folders/not-a-valid-id')
        .send({ name: 'X' });
      expect(res.status).toBe(404);
    });

    it('should reject empty name', async () => {
      const folder = await SkillFolder.create({ name: 'X', author: testUsers.owner._id });
      const res = await request(app)
        .patch(`/api/skills/folders/${folder._id}`)
        .send({ name: '  ' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/skills/folders/:folderId', () => {
    it('should delete an owned folder', async () => {
      const folder = await SkillFolder.create({ name: 'Del', author: testUsers.owner._id });
      const res = await request(app).delete(`/api/skills/folders/${folder._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should return 404 for folder owned by another user', async () => {
      const folder = await SkillFolder.create({ name: 'Protected', author: testUsers.viewer._id });
      const res = await request(app).delete(`/api/skills/folders/${folder._id}`);
      expect(res.status).toBe(404);

      const still = await SkillFolder.findById(folder._id);
      expect(still).toBeDefined();
    });

    it('should return 404 for invalid ObjectId', async () => {
      const res = await request(app).delete('/api/skills/folders/bad-id');
      expect(res.status).toBe(404);
    });
  });
});
