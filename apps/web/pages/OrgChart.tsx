import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { OrgNode, Department, DEPARTMENTS } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ArrowLeft,
  Move,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useUserStatus } from '../contexts/UserStatusContext';
import { useOrg } from '../contexts/OrgContext';
import { useToast } from '../contexts/ToastContext';
import { Dropdown } from '../components/Dropdown';
import { buildTree, getDescendants, ModalState } from '../components/org-chart/orgChartHelpers';
import { TreeNode } from '../components/org-chart/TreeNode';
import { OrgNodeModal } from '../components/org-chart/OrgNodeModal';
import { DeleteConfirmModal } from '../components/org-chart/DeleteConfirmModal';

export const OrgChart: React.FC = () => {
  const { t } = useTranslation(['employees', 'common']);
  const { user, isAdminView } = useAuth();
  const { getStatus: getAvailabilityStatus } = useUserStatus();
  const isAdmin = isAdminView;
  const { nodes, addNode, updateNode, deleteNode, fetchSubTree, fetchAllNodes, isSubTreeView } =
    useOrg();

  // Department filter - use strict type
  const [departmentFilter, setDepartmentFilter] = useState<Department | ''>('');

  // Pan/Zoom — refs for zero-rerender drag, state for React sync
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panPositionRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const zoomSyncTimer = useRef<number>();
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const { showToast } = useToast();

  // Use predefined departments for type safety
  const departments: readonly Department[] = DEPARTMENTS;

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);

  // Apply transform directly to DOM (bypasses React re-renders during pan/zoom)
  const applyTransform = useCallback(() => {
    if (!contentRef.current) return;
    const { x, y } = panPositionRef.current;
    contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoomRef.current})`;
  }, []);

  // Keep refs in sync when React state changes (fitToView, slider, etc.)
  useEffect(() => { panPositionRef.current = panPosition; }, [panPosition]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

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

    // Account for content's natural offset inside the container (padding, flex, etc.)
    const nx = tRect.left - cRect.left;
    const ny = tRect.top - cRect.top;

    // Center the content
    const panX = (cRect.width - tRect.width * newZoom) / 2 - nx;
    const panY = (cRect.height - tRect.height * newZoom) / 2 - ny;

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

  const cancelDrag = useCallback(() => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  }, []);

  // Pan handlers — use refs + direct DOM writes to avoid re-renders during drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[draggable="true"]') || target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) return;
    // Click on empty background cancels active drag
    if (draggedNodeId) {
      cancelDrag();
      return;
    }
    e.preventDefault();
    isPanningRef.current = true;
    startPanRef.current = {
      x: e.clientX - panPositionRef.current.x,
      y: e.clientY - panPositionRef.current.y,
    };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    if (contentRef.current) contentRef.current.style.transition = 'none';
  }, [draggedNodeId, cancelDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    e.preventDefault();
    panPositionRef.current = {
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y,
    };
    applyTransform();
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
    if (contentRef.current) contentRef.current.style.transition = 'transform 0.2s ease-out';
    setPanPosition(panPositionRef.current);
  }, []);

  // Use non-passive wheel listener to prevent browser zoom on Mac
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      zoomRef.current = Math.min(1.5, Math.max(0.3, zoomRef.current + delta));
      applyTransform();
      clearTimeout(zoomSyncTimer.current);
      zoomSyncTimer.current = window.setTimeout(() => setZoom(zoomRef.current), 100);
    };

    // Add with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Touch pan/zoom handlers
  const touchStartRef = useRef<{ x: number; y: number; dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getTouchDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0]!.clientX - touches[1]!.clientX;
      const dy = touches[0]!.clientY - touches[1]!.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) return;

      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0]!.clientX - panPositionRef.current.x,
          y: e.touches[0]!.clientY - panPositionRef.current.y,
          dist: 0,
          zoom: zoomRef.current,
        };
        if (contentRef.current) contentRef.current.style.transition = 'none';
      } else if (e.touches.length === 2) {
        e.preventDefault();
        touchStartRef.current = {
          x: e.touches[0]!.clientX - panPositionRef.current.x,
          y: e.touches[0]!.clientY - panPositionRef.current.y,
          dist: getTouchDistance(e.touches),
          zoom: zoomRef.current,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      e.preventDefault();

      if (e.touches.length === 1) {
        panPositionRef.current = {
          x: e.touches[0]!.clientX - touchStartRef.current.x,
          y: e.touches[0]!.clientY - touchStartRef.current.y,
        };
        applyTransform();
      } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
        const newDist = getTouchDistance(e.touches);
        const scale = newDist / touchStartRef.current.dist;
        zoomRef.current = Math.min(1.5, Math.max(0.3, touchStartRef.current.zoom * scale));
        applyTransform();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (e.touches.length === 0) {
        touchStartRef.current = null;
        if (contentRef.current) contentRef.current.style.transition = 'transform 0.2s ease-out';
        setPanPosition(panPositionRef.current);
        setZoom(zoomRef.current);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [applyTransform]);

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
      showToast(t('orgChart.removedSuccess'), 'success');
      setDeleteConfirmId(null);
    }
  };

  const handleSave = async () => {
    if (!inputName) return;

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
        showToast(t('orgChart.addedSuccess'), 'success');
      } else if (modalState.type === 'edit' && modalState.nodeId) {
        await updateNode(modalState.nodeId, {
          name: inputName,
          role: inputRole,
          department: inputDepartment || undefined,
          avatar: inputAvatar,
          parentId: inputParentId || null, // Allow null for root
        });
        showToast(t('orgChart.updatedSuccess'), 'success');
      }

      setModalState({ ...modalState, isOpen: false });
    } catch (error) {
      showToast(t('orgChart.saveFailed'), 'error');
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
      if (!node) { e.preventDefault(); return; }
      // Block true root nodes (no parent + has children), but allow orphans (no parent + no children)
      const hasReports = nodes.some((n) => n.parentId === nodeId);
      if (!node.parentId && hasReports) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', nodeId);
      // Defer state update so the browser establishes the drag before React re-renders
      setTimeout(() => setDraggedNodeId(nodeId), 0);
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
        showToast(t('orgChart.reassignSuccess', { dragged: draggedName, target: targetName }), 'success');
      } catch {
        showToast(t('orgChart.reassignFailed'), 'error');
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

  // Escape key to cancel drag
  useEffect(() => {
    if (!draggedNodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [draggedNodeId, cancelDrag]);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {t('orgChart.title')}
          </h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
            {isAdmin
              ? t('orgChart.subtitleAdmin')
              : t('orgChart.subtitleEmployee')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          {/* Back to full view button (when in subtree view) */}
          {isSubTreeView && (
            <button
              onClick={fetchAllNodes}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft size={14} />
              {t('orgChart.fullOrgChart')}
            </button>
          )}

          {/* Department Filter */}
          <Dropdown
            id="orgchart-department-filter"
            name="department"
            value={departmentFilter}
            onChange={(value) => setDepartmentFilter(value as Department | '')}
            options={[
              { value: '', label: t('common:departments.allDepartments') },
              ...departments.map((dept) => ({ value: dept, label: dept }))
            ]}
            placeholder={t('common:departments.allDepartments')}
            width="w-full sm:w-44"
          />

          {/* Search Bar */}
          <div className="relative w-full sm:w-auto">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light"
              size={16}
            />
            <input
              type="text"
              placeholder={t('orgChart.findEmployee')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-56"
            />
          </div>

          <div className="hidden sm:flex items-center gap-4 bg-card-light dark:bg-card-dark p-2 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
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
              title={t('orgChart.resetZoom')}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-grow bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 md:p-8 overflow-hidden relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:20px_20px] select-none cursor-grab touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Pan/Zoom hint */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-white/80 dark:bg-gray-800/80 rounded text-[10px] text-text-muted-light dark:text-text-muted-dark z-10">
          <Move size={12} />
          <span>{t('orgChart.dragToZoom')}</span>
        </div>

        {/* Drag banner */}
        {draggedNodeId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
            {t('orgChart.dragging')} <span className="font-bold">{nodes.find((n) => n.id === draggedNodeId)?.name}</span> {t('orgChart.dropToReassign')}
          </div>
        )}
        <div
          ref={contentRef}
          className="flex justify-center min-w-max pt-8 pb-8 transition-transform origin-top-left"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          <div className="flex gap-6 md:gap-16">
            {tree.map((root) => (
              <TreeNode
                key={root.id}
                node={root}
                isRoot
                isAdmin={isAdmin}
                collapsedNodes={collapsedNodes}
                highlightedId={highlightedId}
                draggedNodeId={draggedNodeId}
                dragOverNodeId={dragOverNodeId}
                isValidDrop={isValidDrop}
                getAvailabilityStatus={getAvailabilityStatus}
                t={t}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                toggleCollapse={toggleCollapse}
                fetchSubTree={fetchSubTree}
                openEditModal={openEditModal}
                openAddModal={openAddModal}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Edit/Add Modal - Render only if open (and triggered by admin) */}
      {modalState.isOpen && (
        <OrgNodeModal
          type={modalState.type}
          t={t}
          inputName={inputName}
          setInputName={setInputName}
          inputRole={inputRole}
          setInputRole={setInputRole}
          inputEmail={inputEmail}
          setInputEmail={setInputEmail}
          inputDepartment={inputDepartment}
          setInputDepartment={setInputDepartment}
          inputAvatar={inputAvatar}
          setInputAvatar={setInputAvatar}
          inputParentId={inputParentId}
          setInputParentId={setInputParentId}
          departments={departments}
          availableParents={availableParents}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          t={t}
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
        />
      )}

    </div>
  );
};
