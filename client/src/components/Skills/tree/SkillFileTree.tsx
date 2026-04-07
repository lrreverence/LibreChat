import { useMemo, useState, useCallback } from 'react';
import type { TSkillNode } from 'librechat-data-provider';
import SkillTreeRow from './SkillTreeRow';

export interface SkillTreeData {
  id: string;
  name: string;
  nodeType: 'file' | 'folder';
  fileId?: string;
  children?: SkillTreeData[];
}

interface SkillFileTreeProps {
  nodes: TSkillNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string, nodeType: 'file' | 'folder') => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onMoveNode: (nodeId: string, newParentId: string | null, index: number) => void;
  onDeleteNode: (nodeId: string) => void;
}

function buildTreeData(nodes: TSkillNode[]): SkillTreeData[] {
  const nodeMap = new Map<string, SkillTreeData>();
  const roots: SkillTreeData[] = [];

  for (const node of nodes) {
    nodeMap.set(node._id, {
      id: node._id,
      name: node.name,
      nodeType: node.type,
      fileId: node.fileId,
      children: node.type === 'folder' ? [] : undefined,
    });
  }

  for (const node of nodes) {
    const treeNode = nodeMap.get(node._id);
    if (!treeNode) {
      continue;
    }
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent?.children) {
        parent.children.push(treeNode);
        continue;
      }
    }
    roots.push(treeNode);
  }

  return roots;
}

export default function SkillFileTree({
  nodes,
  selectedNodeId,
  onSelectNode,
  onRenameNode,
  onMoveNode: _onMoveNode,
  onDeleteNode,
}: SkillFileTreeProps) {
  const treeData = useMemo(() => buildTreeData(nodes), [nodes]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleFolder = useCallback((id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const startEditing = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const stopEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  const submitRename = useCallback(
    (id: string, newName: string) => {
      const trimmed = newName.trim();
      if (trimmed) {
        onRenameNode(id, trimmed);
      }
      setEditingId(null);
    },
    [onRenameNode],
  );

  const renderNode = (node: SkillTreeData, depth: number): React.ReactNode => {
    const isOpen = openFolders.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingId === node.id;

    return (
      <div key={node.id}>
        <SkillTreeRow
          node={node}
          depth={depth}
          isOpen={isOpen}
          isSelected={isSelected}
          isEditing={isEditing}
          onSelect={onSelectNode}
          onToggle={toggleFolder}
          onStartEdit={startEditing}
          onStopEdit={stopEditing}
          onSubmitRename={submitRename}
          onDelete={onDeleteNode}
        />
        {node.nodeType === 'folder' && node.children && (
          <div
            className="duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] grid transition-[grid-template-rows]"
            style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="size-full overflow-y-auto px-2 py-1">
      {treeData.map((node) => renderNode(node, 0))}
    </div>
  );
}
