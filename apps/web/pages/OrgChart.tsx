import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OrgNode, Department, DEPARTMENTS } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowLeft,
  Move,
} from 'lucide-react';

// Avatar with fallback to initials
const AvatarWithFallback: React.FC<{
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isRoot?: boolean;
}> = ({ src, name, size = 'md', isRoot = false }) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-rose-500',
      'bg-cyan-500',
      'bg-emerald-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const sizeClasses = {
    sm: isRoot ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm',
    md: isRoot ? 'w-14 h-14 text-lg' : 'w-12 h-12 text-base',
    lg: isRoot ? 'w-16 h-16 text-xl' : 'w-14 h-14 text-lg',
  };

  const ringClasses = isRoot ? 'ring-primary/30' : 'ring-gray-100 dark:ring-gray-700';

  if (hasError || !src) {
    return (
      <div
        className={`${sizeClasses[size]} ${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-semibold ring-2 ${ringClasses}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ${ringClasses}`}
      onError={() => setHasError(true)}
    />
  );
};
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { Toast } from '../components/Toast';
import { Dropdown } from '../components/Dropdown';

// Helper to build tree structure
const buildTree = (nodes: OrgNode[]): OrgNode[] => {
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
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// Helper to get all descendants of a node (to prevent cycles when picking a parent)
const getDescendants = (parentId: string, allNodes: OrgNode[]): string[] => {
  const children = allNodes.filter((n) => n.parentId === parentId);
  let descendants: string[] = children.map((c) => c.id);
  children.forEach((c) => {
    descendants = [...descendants, ...getDescendants(c.id, allNodes)];
  });
  return descendants;
};

// Types for Modal
type ModalType = 'add' | 'edit';
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  nodeId: string | null; // For edit: node being edited, For add: parent node ID
}

export const OrgChart: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';
  const { nodes, addNode, updateNode, deleteNode, fetchSubTree, fetchAllNodes, isSubTreeView } =
    useOrg();

  // Department filter - use strict type
  const [departmentFilter, setDepartmentFilter] = useState<Department | ''>('');

  // Pan/Zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Use predefined departments for type safety
  const departments: readonly Department[] = DEPARTMENTS;

  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  });
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    setToast({ show: true, message, type });
  };

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'add',
    nodeId: null,
  });

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Collapse State
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Drag & Drop state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  // Modal Inputs
  const [inputName, setInputName] = useState('');
  const [inputRole, setInputRole] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputDepartment, setInputDepartment] = useState<Department | ''>('');
  const [inputAvatar, setInputAvatar] = useState('https://picsum.photos/200');
  const [inputParentId, setInputParentId] = useState<string>('');

  // Filter nodes by department (keep all nodes if no filter, to preserve tree structure)
  const filteredNodes = useMemo(() => {
    if (!departmentFilter) return nodes;
    // When filtering, include matched nodes and their ancestors to preserve tree structure
    const matchedIds = new Set(
      nodes.filter((n) => n.department === departmentFilter).map((n) => n.id)
    );
    // Add all ancestors of matched nodes
    const withAncestors = new Set(matchedIds);
    matchedIds.forEach((id) => {
      let current = nodes.find((n) => n.id === id);
      const visited = new Set<string>();
      while (current?.parentId && !visited.has(current.parentId)) {
        visited.add(current.parentId);
        withAncestors.add(current.parentId);
        current = nodes.find((n) => n.id === current!.parentId);
      }
    });
    return nodes.filter((n) => withAncestors.has(n.id));
  }, [nodes, departmentFilter]);

  const tree = useMemo(() => buildTree(filteredNodes), [filteredNodes]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  // Fit the tree content to the visible container area
  const fitToView = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const cRect = container.getBoundingClientRect();
    const padding = 64; // px breathing room
    const availW = cRect.width - padding;
    const availH = cRect.height - padding;

    // Measure content at scale=1 (reset transform temporarily)
    const prevTransform = content.style.transform;
    const prevTransition = content.style.transition;
    content.style.transition = 'none';
    content.style.transform = 'translate(0px, 0px) scale(1)';
    const tRect = content.getBoundingClientRect();
    content.style.transform = prevTransform;
    content.style.transition = prevTransition;

    if (tRect.width === 0 || tRect.height === 0) return;

    const scaleX = availW / tRect.width;
    const scaleY = availH / tRect.height;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5);

    // Center the content
    const panX = (cRect.width - tRect.width * newZoom) / 2;
    const panY = (cRect.height - tRect.height * newZoom) / 2;

    setZoom(newZoom);
    setPanPosition({ x: panX, y: panY });
  }, []);

  const resetZoom = () => {
    fitToView();
  };

  // Auto-fit when tree data changes
  useEffect(() => {
    // Small delay to let the DOM render the tree nodes first
    const timer = setTimeout(fitToView, 100);
    return () => clearTimeout(timer);
  }, [tree, fitToView]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    // Don't start panning if clicking on interactive elements (buttons, inputs, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('[draggable="true"]') || target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }

    // Prevent text selection during drag
    e.preventDefault();
    setIsPanning(true);
    setStartPan({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  }, [panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  }, [isPanning, startPan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Use non-passive wheel listener to prevent browser zoom on Mac
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((prev) => Math.min(1.5, Math.max(0.3, prev + delta)));
    };

    // Add with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Toggle Collapse
  const toggleCollapse = (id: string) => {
    const next = new Set(collapsedNodes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCollapsedNodes(next);
  };

  // Search Logic
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setHighlightedId(null);
      return;
    }

    // Simple find first match
    const found = nodes.find(
      (n) =>
        n.name.toLowerCase().includes(term.toLowerCase()) ||
        n.role.toLowerCase().includes(term.toLowerCase())
    );

    if (found) {
      setHighlightedId(found.id);
      // Expand parents path
      const toExpand = new Set<string>();
      let curr = found;
      while (curr.parentId) {
        toExpand.add(curr.parentId);
        const parent = nodes.find((n) => n.id === curr.parentId);
        if (!parent) break;
        curr = parent;
      }

      // Remove found parents from collapsed set to ensure visibility
      setCollapsedNodes((prev) => {
        const next = new Set(prev);
        toExpand.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setHighlightedId(null);
    }
  };

  // Node Actions
  const openAddModal = (parentId: string) => {
    if (!isAdmin) return;
    setModalState({ isOpen: true, type: 'add', nodeId: parentId });
    setInputName('');
    setInputRole('');
    setInputEmail('');
    setInputDepartment('');
    setInputAvatar('https://picsum.photos/200?random=' + Math.floor(Math.random() * 1000));
    setInputParentId(parentId);
  };

  const openEditModal = (node: OrgNode) => {
    if (!isAdmin) return;
    setModalState({ isOpen: true, type: 'edit', nodeId: node.id });
    setInputName(node.name);
    setInputRole(node.role);
    setInputEmail(node.email || '');
    setInputDepartment(node.department || '');
    setInputAvatar(node.avatar);
    setInputParentId(node.parentId || '');
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteNode(deleteConfirmId);
      showToast('Employee removed from org chart.', 'success');
      setDeleteConfirmId(null);
    }
  };

  const handleSave = async () => {
    if (!inputName || !inputRole) return;

    try {
      if (modalState.type === 'add') {
        if (!inputEmail) return; // Email is required for new employees
        const newNode = {
          id: Date.now().toString(),
          parentId: inputParentId || modalState.nodeId,
          name: inputName,
          role: inputRole,
          email: inputEmail,
          department: inputDepartment || undefined,
          avatar: inputAvatar,
        };
        await addNode(newNode);
        showToast('Employee added successfully.', 'success');
      } else if (modalState.type === 'edit' && modalState.nodeId) {
        await updateNode(modalState.nodeId, {
          name: inputName,
          role: inputRole,
          department: inputDepartment || undefined,
          avatar: inputAvatar,
          parentId: inputParentId || null, // Allow null for root
        });
        showToast('Position updated successfully.', 'success');
      }

      setModalState({ ...modalState, isOpen: false });
    } catch (error) {
      showToast('Failed to save changes. Please try again.', 'error');
    }
  };

  // Get available parents for the dropdown (exclude self and descendants to prevent cycles)
  const availableParents = useMemo(() => {
    if (modalState.type === 'add') return nodes;
    if (!modalState.nodeId) return nodes;

    const descendants = getDescendants(modalState.nodeId, nodes);
    return nodes.filter((n) => n.id !== modalState.nodeId && !descendants.includes(n.id));
  }, [nodes, modalState]);

  // Drag & Drop: check if dropping draggedId onto targetId is valid
  const isValidDrop = useCallback(
    (draggedId: string, targetId: string): boolean => {
      if (draggedId === targetId) return false; // Can't drop on self
      const draggedNode = nodes.find((n) => n.id === draggedId);
      if (!draggedNode) return false;
      if (draggedNode.parentId === targetId) return false; // Already reports to this person
      const descendants = getDescendants(draggedId, nodes);
      if (descendants.includes(targetId)) return false; // Cycle prevention
      return true;
    },
    [nodes]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      if (!isAdmin) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !node.parentId) {
        e.preventDefault(); // Block root nodes
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', nodeId);
      setDraggedNodeId(nodeId);
    },
    [isAdmin, nodes]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedNodeId || draggedNodeId === targetId) {
        e.dataTransfer.dropEffect = 'none';
      } else if (isValidDrop(draggedNodeId, targetId)) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
      setDragOverNodeId(targetId);
    },
    [draggedNodeId, isValidDrop]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverNodeId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || !isValidDrop(draggedId, targetId)) {
        setDraggedNodeId(null);
        setDragOverNodeId(null);
        return;
      }
      try {
        await updateNode(draggedId, { parentId: targetId });
        const draggedName = nodes.find((n) => n.id === draggedId)?.name || 'Employee';
        const targetName = nodes.find((n) => n.id === targetId)?.name || 'Manager';
        showToast(`${draggedName} now reports to ${targetName}.`, 'success');
      } catch {
        showToast('Failed to reassign manager. Please try again.', 'error');
      }
      setDraggedNodeId(null);
      setDragOverNodeId(null);
    },
    [isValidDrop, updateNode, nodes, showToast]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  }, []);

  // Recursive Tree Component with visual tree connectors
  const TreeNode: React.FC<{ node: OrgNode; isRoot?: boolean }> = ({ node, isRoot = false }) => {
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isHighlighted = node.id === highlightedId;
    const childCount = node.children?.length || 0;

    // Drag & drop state for this card
    const isDragging = draggedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id && draggedNodeId !== null;
    const canDrop = isDragOver && draggedNodeId !== null && isValidDrop(draggedNodeId, node.id);
    const isDraggable = isAdmin && !!node.parentId;

    return (
      <div className="flex flex-col items-center">
        <div className="group relative z-10">
          {/* Card */}
          <div
            draggable={isDraggable}
            onDragStart={(e) => handleDragStart(e, node.id)}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.id)}
            onDragEnd={handleDragEnd}
            className={`flex flex-col items-center bg-card-light dark:bg-card-dark border transition-all duration-200 rounded-xl p-4 w-52 ${
              isHighlighted
                ? 'ring-4 ring-primary border-primary scale-105 shadow-lg shadow-primary/20'
                : isDragging
                  ? 'opacity-40 scale-95 border-border-light dark:border-border-dark shadow-sm'
                  : isDragOver && canDrop
                    ? 'ring-4 ring-green-400 border-green-400 bg-green-50 dark:bg-green-900/20 scale-105 shadow-lg'
                    : isDragOver && !canDrop
                      ? 'ring-4 ring-red-400 border-red-400'
                      : 'border-border-light dark:border-border-dark shadow-sm'
            } ${isRoot ? 'ring-2 ring-primary/30 shadow-md' : ''}
              ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
              ${isAdmin && !isDragging ? 'hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5' : ''}`}
          >
            {/* Avatar with fallback and status indicator */}
            <div className="relative mb-3">
              <AvatarWithFallback src={node.avatar} name={node.name} size="md" isRoot={isRoot} />
              {node.status && (
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                    node.status === 'Active'
                      ? 'bg-green-500'
                      : node.status === 'On Leave'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                  }`}
                  title={node.status}
                ></span>
              )}
            </div>
            <h3
              className={`font-bold text-text-light dark:text-text-dark text-center ${isRoot ? 'text-sm' : 'text-sm'}`}
            >
              {node.name}
            </h3>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center">
              {node.role}
            </p>

            {/* Department badge */}
            {node.department && (
              <span className="mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {node.department}
              </span>
            )}

            {/* Direct report count */}
            {node.directReportCount !== undefined && node.directReportCount > 0 && (
              <div
                className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted-light dark:text-text-muted-dark cursor-pointer hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchSubTree(node.id);
                }}
                title={`View ${node.directReportCount} direct report${node.directReportCount > 1 ? 's' : ''}`}
              >
                <Users size={10} />
                <span>
                  {node.directReportCount} report{node.directReportCount > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(node.id);
                }}
                className="mt-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light transition-colors"
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
          </div>

          {/* Hover Actions - ADMIN ONLY */}
          {isAdmin && (
            <div className="absolute -right-3 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-card-dark shadow-lg rounded-lg p-1 border border-border-light dark:border-border-dark z-20">
              <button
                onClick={() => openEditModal(node)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500"
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => openAddModal(node.id)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-green-500"
                title="Add Subordinate"
              >
                <Plus size={14} />
              </button>
              {!node.parentId ? null : (
                <button
                  onClick={() => handleDelete(node.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tree Connectors & Children */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Vertical line from parent to horizontal bar */}
            <div className="w-[2px] h-6 bg-primary/30 dark:bg-primary/25"></div>

            {/* Children row */}
            <div className="flex">
              {node.children!.map((child, index) => (
                <div key={child.id} className="flex flex-col items-center px-4 relative">
                  {/* Horizontal connector segment: first=right half, last=left half, middle=full */}
                  {childCount > 1 && (
                    <div
                      className="absolute top-0 h-[2px] bg-primary/30 dark:bg-primary/25"
                      style={{
                        left: index === 0 ? '50%' : '0',
                        right: index === node.children!.length - 1 ? '50%' : '0',
                      }}
                    />
                  )}
                  {/* Vertical drop line */}
                  <div className="w-[2px] h-6 bg-primary/30 dark:bg-primary/25"></div>
                  <TreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed indicator */}
        {hasChildren && isCollapsed && (
          <div className="flex flex-col items-center mt-1">
            <div className="w-0.5 h-3 bg-primary/10"></div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] text-primary/60 font-medium">
              <Users size={10} />
              {childCount}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            Organizational Structure
          </h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
            {isAdmin
              ? 'Hover over cards to add, edit or remove people. Drag cards to reassign managers.'
              : 'View the company hierarchy.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Back to full view button (when in subtree view) */}
          {isSubTreeView && (
            <button
              onClick={fetchAllNodes}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft size={14} />
              Full Org Chart
            </button>
          )}

          {/* Department Filter */}
          <Dropdown
            id="orgchart-department-filter"
            name="department"
            value={departmentFilter}
            onChange={(value) => setDepartmentFilter(value as Department | '')}
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map((dept) => ({ value: dept, label: dept }))
            ]}
            placeholder="All Departments"
            width="w-44"
          />

          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light"
              size={16}
            />
            <input
              type="text"
              placeholder="Find employee..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-56"
            />
          </div>

          <div className="flex items-center gap-4 bg-card-light dark:bg-card-dark p-2 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
            <div className="flex items-center gap-2">
              <ZoomOut size={16} className="text-text-muted-light" />
              <input
                type="range"
                min="0.3"
                max="1.5"
                step="0.1"
                value={zoom}
                onChange={handleZoomChange}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
              />
              <ZoomIn size={16} className="text-text-muted-light" />
            </div>
            <div className="h-4 w-px bg-border-light dark:bg-border-dark mx-1"></div>
            <button
              onClick={resetZoom}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-text-light transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex-grow bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-8 overflow-hidden relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:20px_20px] select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Pan/Zoom hint */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-white/80 dark:bg-gray-800/80 rounded text-[10px] text-text-muted-light dark:text-text-muted-dark z-10">
          <Move size={12} />
          <span>Drag to pan • Scroll to zoom</span>
        </div>

        {/* Drag banner */}
        {draggedNodeId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            Dragging <span className="font-bold">{nodes.find((n) => n.id === draggedNodeId)?.name}</span> — drop on a card to reassign manager
          </div>
        )}
        <div
          ref={contentRef}
          className="flex justify-center min-w-max pt-8 pb-8 transition-transform origin-top-left"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <div className="flex gap-16">
            {tree.map((root) => (
              <TreeNode key={root.id} node={root} isRoot />
            ))}
          </div>
        </div>
      </div>

      {/* Edit/Add Modal - Render only if open (and triggered by admin) */}
      {modalState.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                {modalState.type === 'add' ? 'Add New Position' : 'Edit Position'}
              </h3>
              <button
                onClick={() => setModalState({ ...modalState, isOpen: false })}
                className="text-text-muted-light hover:text-text-light"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  placeholder="Employee Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  Role / Job Title
                </label>
                <input
                  type="text"
                  value={inputRole}
                  onChange={(e) => setInputRole(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  placeholder="e.g. Senior Developer"
                />
              </div>

              {/* Email - required for adding */}
              {modalState.type === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    placeholder="employee@aiya.ai"
                  />
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  Department
                </label>
                <Dropdown
                  value={inputDepartment}
                  onChange={(value) => setInputDepartment(value as Department | '')}
                  options={[
                    { value: '', label: 'Select Department' },
                    ...departments.map((dept) => ({ value: dept, label: dept }))
                  ]}
                  placeholder="Select Department"
                />
              </div>

              {modalState.type === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    Reports To
                  </label>
                  <Dropdown
                    value={inputParentId || ''}
                    onChange={(value) => setInputParentId(value)}
                    options={[
                      { value: '', label: 'No Manager (Root Node)' },
                      ...availableParents.map((parent) => ({
                        value: parent.id,
                        label: `${parent.name} (${parent.role})`
                      }))
                    ]}
                    placeholder="Select Manager"
                  />
                  <p className="text-xs text-text-muted-light mt-1">
                    Change to reassign this employee's manager.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={inputAvatar}
                  onChange={(e) => setInputAvatar(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark text-xs font-mono"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setModalState({ ...modalState, isOpen: false })}
                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                <Check size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
                Remove from Org Chart?
              </h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                This will remove this person and all their direct reports from the organization
                chart.
              </p>
            </div>
            <div className="flex justify-center gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={16} /> Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};
