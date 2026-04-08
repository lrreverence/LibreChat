const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const { ObjectId } = require('mongodb');
const { generateCheckAccess } = require('@librechat/api');
const { logger, escapeRegExp } = require('@librechat/data-schemas');
const { createMulterInstance } = require('~/server/routes/files/multer');
const { skillsLimiter } = require('~/server/middleware/limiters/skillsLimiter');
const paths = require('~/config/paths');
const {
  Permissions,
  ResourceType,
  AccessRoleIds,
  PrincipalType,
  PermissionBits,
  PermissionTypes,
} = require('librechat-data-provider');
const { requireJwtAuth, canAccessSkillResource } = require('~/server/middleware');
const {
  createSkill,
  getSkillById,
  updateSkill,
  deleteSkill,
  getRoleByName,
  getListSkillsByAccess,
  getSkillTree,
  getSkillNode,
  createSkillNode,
  updateSkillNode,
  deleteSkillNode,
  deleteSkillNodes,
  findFileById,
  updateFile,
  createFile,
} = require('~/models');
const {
  findPubliclyAccessibleResources,
  findAccessibleResources,
  grantPermission,
} = require('~/server/services/PermissionService');

const router = express.Router();

const checkSkillAccess = generateCheckAccess({
  permissionType: PermissionTypes.SKILLS,
  permissions: [Permissions.USE],
  getRoleByName,
});

const checkSkillCreate = generateCheckAccess({
  permissionType: PermissionTypes.SKILLS,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});

/** Allowed fields for skill create/update — prevents mass assignment of author, tenantId, etc. */
const ALLOWED_SKILL_FIELDS = ['name', 'description', 'category', 'invocationMode'];

/** Maximum size of inline text file content (1 MB). */
const MAX_TEXT_FILE_BYTES = 1024 * 1024;
/** Cap on the size of the accessible-IDs $in clause to bound query cost. */
const MAX_ACCESSIBLE_IDS = 1000;
/** Maximum number of bytes allowed in a single skill node `name` (matches typical FS limit). */
const MAX_NAME_LENGTH = 255;

function pickAllowed(body, fields) {
  const result = {};
  for (const key of fields) {
    if (body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
}

/**
 * Validates a user-supplied filename and returns its safe basename.
 * Rejects empty, traversal, separator, NUL, and oversized names.
 */
function safeBaseName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return null;
  }
  if (name.length > MAX_NAME_LENGTH) {
    return null;
  }
  if (name.includes('\0') || name.includes('/') || name.includes('\\') || name.includes('..')) {
    return null;
  }
  const base = path.basename(name);
  if (!base || base === '.' || base === '..') {
    return null;
  }
  return base;
}

/**
 * Asserts the resolved target path is contained within the resolved base directory.
 * Throws if traversal is detected.
 */
function assertWithinDir(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Path escapes upload directory');
  }
}

function tryObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

router.use(requireJwtAuth);
router.use(checkSkillAccess);

/**
 * Creates a new skill.
 * @route POST /api/skills
 */
router.post('/', skillsLimiter, checkSkillCreate, async (req, res) => {
  let createdSkillId = null;
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ error: 'Skill name is required and must be a non-empty string' });
    }

    const allowed = pickAllowed(req.body, ALLOWED_SKILL_FIELDS);
    const result = await createSkill({
      ...allowed,
      author: req.user.id,
      authorName: req.user.name,
    });
    createdSkillId = result._id;

    await grantPermission({
      principalType: PrincipalType.USER,
      principalId: req.user.id,
      resourceType: ResourceType.SKILL,
      resourceId: result._id,
      accessRoleId: AccessRoleIds.SKILL_OWNER,
      grantedBy: req.user.id,
    });

    const initialContent = `# ${result.name}\n\n${result.description || ''}\n`;
    const fileId = crypto.randomUUID();
    const dir = path.join(paths.uploads, req.user.id, 'skills', result._id.toString());
    await fs.mkdir(dir, { recursive: true });
    const filepath = path.join(dir, `${fileId}-SKILL.md`);
    assertWithinDir(dir, filepath);
    await fs.writeFile(filepath, initialContent, 'utf-8');

    await createFile(
      {
        user: req.user.id,
        file_id: fileId,
        filename: 'SKILL.md',
        filepath,
        type: 'text/markdown',
        bytes: Buffer.byteLength(initialContent),
        context: 'skill_file',
        source: 'local',
      },
      true,
    );

    await createSkillNode({
      skillId: result._id,
      parentId: null,
      type: 'file',
      name: 'SKILL.md',
      fileId,
      order: 0,
      author: new ObjectId(req.user.id),
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('[createSkill]', error);
    if (createdSkillId) {
      try {
        await deleteSkill({ _id: createdSkillId });
      } catch (rollbackErr) {
        logger.error('[createSkill] rollback failed', rollbackErr);
      }
    }
    res.status(500).json({ error: 'Error creating skill' });
  }
});

/**
 * Lists skills with ACL-aware filtering, public skill merging, and cursor pagination.
 * @route GET /api/skills
 */
router.get('/', skillsLimiter, async (req, res) => {
  try {
    const { search, category, isPublic, limit, after } = req.query;

    let parsedLimit;
    if (limit !== undefined) {
      const n = Number.parseInt(limit, 10);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: 'limit must be a positive integer' });
      }
      parsedLimit = n;
    }

    const [accessibleIds, publiclyAccessibleIds] = await Promise.all([
      findAccessibleResources({
        userId: req.user.id,
        role: req.user.role,
        resourceType: ResourceType.SKILL,
        requiredPermissions: PermissionBits.VIEW,
      }),
      findPubliclyAccessibleResources({
        resourceType: ResourceType.SKILL,
        requiredPermissions: PermissionBits.VIEW,
      }),
    ]);

    const publicIdSet = new Set(publiclyAccessibleIds.map((id) => id.toString()));

    const mergedIdSet = new Set();
    const mergedIds = [];
    for (const id of accessibleIds) {
      if (mergedIds.length >= MAX_ACCESSIBLE_IDS) {
        break;
      }
      const key = id.toString();
      if (!mergedIdSet.has(key)) {
        mergedIdSet.add(key);
        mergedIds.push(id);
      }
    }
    for (const id of publiclyAccessibleIds) {
      if (mergedIds.length >= MAX_ACCESSIBLE_IDS) {
        break;
      }
      const key = id.toString();
      if (!mergedIdSet.has(key)) {
        mergedIdSet.add(key);
        mergedIds.push(new ObjectId(key));
      }
    }

    const otherParams = {};
    if (search) {
      otherParams.name = new RegExp(escapeRegExp(search), 'i');
    }
    if (category) {
      otherParams.category = category;
    }
    if (isPublic === 'true') {
      otherParams.isPublic = true;
    }

    const result = await getListSkillsByAccess({
      accessibleIds: mergedIds,
      otherParams,
      limit: parsedLimit,
      after: after || undefined,
    });

    if (!result) {
      return res.status(200).json({
        object: 'list',
        data: [],
        first_id: null,
        last_id: null,
        has_more: false,
        after: null,
      });
    }

    const decorated = new Array(result.data.length);
    for (let i = 0; i < result.data.length; i++) {
      const skill = result.data[i];
      decorated[i] = publicIdSet.has(skill._id.toString()) ? { ...skill, isPublic: true } : skill;
    }
    result.data = decorated;

    res.status(200).json(result);
  } catch (error) {
    logger.error('[listSkills]', error);
    res.status(500).json({ error: 'Error listing skills' });
  }
});

/* ────────────────── Skill-tree (node) sub-routes ────────────────── */

router.get(
  '/:skillId/tree',
  skillsLimiter,
  canAccessSkillResource({ requiredPermission: PermissionBits.VIEW }),
  async (req, res) => {
    try {
      const nodes = await getSkillTree({ skillId: req.params.skillId });
      res.status(200).json({ nodes });
    } catch (error) {
      logger.error('[GET /skills/:skillId/tree]', error);
      res.status(500).json({ message: 'Error fetching skill tree' });
    }
  },
);

router.post(
  '/:skillId/tree/node',
  skillsLimiter,
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.EDIT }),
  async (req, res, next) => {
    let upload;
    try {
      upload = await createMulterInstance();
    } catch (error) {
      logger.error('[POST /skills/:skillId/tree/node] multer init error', error);
      return res.status(500).json({ message: 'Upload initialization failed' });
    }
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { skillId } = req.params;
      const { type, name, parentId, order } = req.body;

      if (!type || !name) {
        return res.status(400).json({ message: 'type and name are required' });
      }
      if (!['file', 'folder'].includes(type)) {
        return res.status(400).json({ message: 'type must be file or folder' });
      }

      const safeName = safeBaseName(name);
      if (!safeName) {
        return res.status(400).json({ message: 'Invalid node name' });
      }

      const skillObjectId = tryObjectId(skillId);
      if (!skillObjectId) {
        return res.status(400).json({ message: 'Invalid skillId' });
      }

      let parentObjectId = null;
      if (parentId) {
        parentObjectId = tryObjectId(parentId);
        if (!parentObjectId) {
          return res.status(400).json({ message: 'Invalid parentId' });
        }
        const parent = await getSkillNode({ _id: parentObjectId });
        if (!parent || parent.skillId.toString() !== skillId) {
          return res.status(400).json({ message: 'parentId does not belong to this skill' });
        }
        if (parent.type !== 'folder') {
          return res.status(400).json({ message: 'parentId must reference a folder' });
        }
      }

      let parsedOrder = 0;
      if (order !== undefined) {
        if (typeof order !== 'number' || !Number.isFinite(order)) {
          return res.status(400).json({ message: 'order must be a number' });
        }
        parsedOrder = order;
      }

      const nodeData = {
        skillId: skillObjectId,
        parentId: parentObjectId,
        type,
        name: safeName,
        order: parsedOrder,
        author: new ObjectId(req.user.id),
      };

      if (req.file && type === 'file') {
        const fileId = crypto.randomUUID();
        const dir = path.join(paths.uploads, req.user.id, 'skills', skillId);
        await fs.mkdir(dir, { recursive: true });
        const destPath = path.join(dir, `${fileId}-${safeName}`);
        assertWithinDir(dir, destPath);
        await fs.rename(req.file.path, destPath);

        await createFile(
          {
            user: req.user.id,
            file_id: fileId,
            filename: safeName,
            filepath: destPath,
            type: req.file.mimetype || 'application/octet-stream',
            bytes: req.file.size,
            context: 'skill_file',
            source: 'local',
          },
          true,
        );

        nodeData.fileId = fileId;
      }

      const node = await createSkillNode(nodeData);
      res.status(201).json(node);
    } catch (error) {
      logger.error('[POST /skills/:skillId/tree/node]', error);
      res.status(500).json({ message: 'Error creating skill node' });
    }
  },
);

router.patch(
  '/:skillId/tree/node/:nodeId',
  skillsLimiter,
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.EDIT }),
  async (req, res) => {
    try {
      const { skillId, nodeId } = req.params;

      if (!tryObjectId(nodeId)) {
        return res.status(400).json({ message: 'Invalid nodeId' });
      }

      const allowed = {};

      if (req.body.name !== undefined) {
        const safeName = safeBaseName(req.body.name);
        if (!safeName) {
          return res.status(400).json({ message: 'Invalid name' });
        }
        allowed.name = safeName;
      }

      if (req.body.order !== undefined) {
        if (typeof req.body.order !== 'number' || !Number.isFinite(req.body.order)) {
          return res.status(400).json({ message: 'order must be a number' });
        }
        allowed.order = req.body.order;
      }

      if (req.body.parentId === null) {
        allowed.parentId = null;
      } else if (req.body.parentId !== undefined) {
        const parentObjectId = tryObjectId(req.body.parentId);
        if (!parentObjectId) {
          return res.status(400).json({ message: 'Invalid parentId' });
        }
        const parent = await getSkillNode({ _id: parentObjectId });
        if (!parent || parent.skillId.toString() !== skillId) {
          return res.status(400).json({ message: 'parentId does not belong to this skill' });
        }
        if (parent.type !== 'folder') {
          return res.status(400).json({ message: 'parentId must reference a folder' });
        }
        if (parent._id.toString() === nodeId) {
          return res.status(400).json({ message: 'A node cannot be its own parent' });
        }
        allowed.parentId = parentObjectId;
      }

      const existing = await getSkillNode({ _id: nodeId });
      if (!existing || existing.skillId.toString() !== skillId) {
        return res.status(404).json({ message: 'Node not found' });
      }

      const node = await updateSkillNode({ _id: nodeId, data: allowed });
      if (!node) {
        return res.status(404).json({ message: 'Node not found' });
      }
      res.status(200).json(node);
    } catch (error) {
      logger.error('[PATCH /skills/:skillId/tree/node/:nodeId]', error);
      res.status(500).json({ message: 'Error updating skill node' });
    }
  },
);

router.delete(
  '/:skillId/tree/node/:nodeId',
  skillsLimiter,
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.DELETE }),
  async (req, res) => {
    try {
      const existing = await getSkillNode({ _id: req.params.nodeId });
      if (!existing || existing.skillId.toString() !== req.params.skillId) {
        return res.status(404).json({ message: 'Node not found' });
      }
      const result = await deleteSkillNode({ _id: req.params.nodeId });
      res.status(200).json(result);
    } catch (error) {
      logger.error('[DELETE /skills/:skillId/tree/node/:nodeId]', error);
      res.status(500).json({ message: 'Error deleting skill node' });
    }
  },
);

router.get(
  '/:skillId/tree/node/:nodeId/content',
  skillsLimiter,
  canAccessSkillResource({ requiredPermission: PermissionBits.VIEW }),
  async (req, res) => {
    try {
      const node = await getSkillNode({ _id: req.params.nodeId });
      if (!node || node.type !== 'file' || node.skillId.toString() !== req.params.skillId) {
        return res.status(404).json({ message: 'File node not found' });
      }

      if (!node.fileId) {
        return res.status(200).json({ content: '', mimeType: 'text/plain', name: node.name });
      }

      const file = await findFileById(node.fileId);
      if (!file) {
        return res.status(404).json({ message: 'Associated file not found' });
      }

      if (file.type && file.type.startsWith('text/')) {
        const skillDir = path.join(
          paths.uploads,
          file.user.toString(),
          'skills',
          req.params.skillId,
        );
        try {
          assertWithinDir(skillDir, file.filepath);
        } catch {
          return res.status(403).json({ message: 'File path is outside skill directory' });
        }
        const stat = await fs.stat(file.filepath);
        if (stat.size > MAX_TEXT_FILE_BYTES) {
          return res.status(413).json({ message: 'File too large to display inline' });
        }
        const content = await fs.readFile(file.filepath, 'utf-8');
        return res.status(200).json({ content, mimeType: file.type, name: node.name });
      }

      return res.status(200).json({
        content: null,
        mimeType: file.type,
        name: node.name,
        downloadUrl: `/api/files/download/${file.user}/${file.file_id}`,
      });
    } catch (error) {
      logger.error('[GET /skills/:skillId/tree/node/:nodeId/content]', error);
      res.status(500).json({ message: 'Error fetching node content' });
    }
  },
);

router.put(
  '/:skillId/tree/node/:nodeId/content',
  skillsLimiter,
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.EDIT }),
  async (req, res) => {
    try {
      const node = await getSkillNode({ _id: req.params.nodeId });
      if (!node || node.type !== 'file' || node.skillId.toString() !== req.params.skillId) {
        return res.status(404).json({ message: 'File node not found' });
      }

      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ message: 'content must be a string' });
      }
      if (Buffer.byteLength(content) > MAX_TEXT_FILE_BYTES) {
        return res.status(413).json({ message: 'Content exceeds maximum size' });
      }

      const safeName = safeBaseName(node.name);
      if (!safeName) {
        return res.status(400).json({ message: 'Invalid stored node name' });
      }

      if (node.fileId) {
        const file = await findFileById(node.fileId);
        if (file && file.filepath) {
          const skillDir = path.join(
            paths.uploads,
            file.user.toString(),
            'skills',
            req.params.skillId,
          );
          try {
            assertWithinDir(skillDir, file.filepath);
          } catch {
            return res.status(403).json({ message: 'File path is outside skill directory' });
          }
          await fs.writeFile(file.filepath, content, 'utf-8');
          await updateFile({ file_id: node.fileId, bytes: Buffer.byteLength(content) });
        }
      } else {
        const fileId = crypto.randomUUID();
        const dir = path.join(paths.uploads, req.user.id, 'skills', req.params.skillId);
        await fs.mkdir(dir, { recursive: true });
        const filepath = path.join(dir, `${fileId}-${safeName}`);
        assertWithinDir(dir, filepath);
        await fs.writeFile(filepath, content, 'utf-8');

        await createFile(
          {
            user: req.user.id,
            file_id: fileId,
            filename: safeName,
            filepath,
            type: 'text/plain',
            bytes: Buffer.byteLength(content),
            context: 'skill_file',
            source: 'local',
          },
          true,
        );

        await updateSkillNode({ _id: node._id.toString(), data: { fileId } });
      }

      const updated = await getSkillNode({ _id: req.params.nodeId });
      res.status(200).json(updated);
    } catch (error) {
      logger.error('[PUT /skills/:skillId/tree/node/:nodeId/content]', error);
      res.status(500).json({ message: 'Error updating node content' });
    }
  },
);

/* ────────────────── Skill CRUD by ID ────────────────── */

router.get(
  '/:skillId',
  skillsLimiter,
  canAccessSkillResource({ requiredPermission: PermissionBits.VIEW }),
  async (req, res) => {
    try {
      const skill = await getSkillById({ _id: req.params.skillId });
      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      res.status(200).json(skill);
    } catch (error) {
      logger.error('[getSkill]', error);
      res.status(500).json({ error: 'Error getting skill' });
    }
  },
);

router.patch(
  '/:skillId',
  skillsLimiter,
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.EDIT }),
  async (req, res) => {
    try {
      const allowed = pickAllowed(req.body, ALLOWED_SKILL_FIELDS);
      const result = await updateSkill({ _id: req.params.skillId, data: allowed });
      if (!result) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      res.status(200).json(result);
    } catch (error) {
      logger.error('[updateSkill]', error);
      res.status(500).json({ error: 'Error updating skill' });
    }
  },
);

router.delete(
  '/:skillId',
  skillsLimiter,
  checkSkillCreate,
  canAccessSkillResource({ requiredPermission: PermissionBits.DELETE }),
  async (req, res) => {
    try {
      try {
        await deleteSkillNodes({ skillId: req.params.skillId });
      } catch (cascadeErr) {
        logger.error('[deleteSkill] cascade delete of nodes failed', cascadeErr);
      }
      const result = await deleteSkill({ _id: req.params.skillId });
      res.status(200).json(result);
    } catch (error) {
      logger.error('[deleteSkill]', error);
      res.status(500).json({ error: 'Error deleting skill' });
    }
  },
);

module.exports = router;
