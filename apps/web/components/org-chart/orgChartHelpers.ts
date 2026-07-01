import { OrgNode } from '../../types';

// Helper to build tree structure
export const buildTree = (nodes: OrgNode[]): OrgNode[] => {
  const nodeMap = new Map<string, OrgNode>();

  // Create map and shallow copies
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  const roots: OrgNode[] = [];

  // Reconstruct hierarchy
  nodeMap.forEach((node) => {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children?.push(node);
      } else {
        // Parent not in dataset (terminated/deleted) — show as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// Helper to get all descendants of a node (to prevent cycles when picking a parent)
export const getDescendants = (parentId: string, allNodes: OrgNode[]): string[] => {
  const children = allNodes.filter((n) => n.parentId === parentId);
  let descendants: string[] = children.map((c) => c.id);
  children.forEach((c) => {
    descendants = [...descendants, ...getDescendants(c.id, allNodes)];
  });
  return descendants;
};

// Types for Modal
export type ModalType = 'add' | 'edit';
export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  nodeId: string | null; // For edit: node being edited, For add: parent node ID
}
