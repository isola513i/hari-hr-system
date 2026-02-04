import React, { useState, useMemo } from 'react';
import { OrgNode } from '../types';
import { Plus, Edit2, Trash2, X, ZoomIn, ZoomOut, RotateCcw, Search, Users, ChevronDown, ChevronUp, Check, Filter, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { Toast } from '../components/Toast';

// Helper to build tree structure
const buildTree = (nodes: OrgNode[]): OrgNode[] => {
  const nodeMap = new Map<string, OrgNode>();

  // Create map and shallow copies
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  const roots: OrgNode[] = [];

  // Reconstruct hierarchy
  nodeMap.forEach(node => {
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
  const children = allNodes.filter(n => n.parentId === parentId);
  let descendants: string[] = children.map(c => c.id);
  children.forEach(c => {
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
  const { nodes, addNode, updateNode, deleteNode, fetchSubTree, fetchAllNodes, isSubTreeView } = useOrg();

  // Department filter
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Extract unique departments from nodes
  const departments = useMemo(() => {
    const depts = new Set(nodes.map(n => n.department).filter(Boolean) as string[]);
    return Array.from(depts).sort();
  }, [nodes]);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success'
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: 'add', nodeId: null });

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Collapse State
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Modal Inputs
  const [inputName, setInputName] = useState('');
  const [inputRole, setInputRole] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputDepartment, setInputDepartment] = useState('');
  const [inputAvatar, setInputAvatar] = useState('https://picsum.photos/200');
  const [inputParentId, setInputParentId] = useState<string>('');

  // Filter nodes by department (keep all nodes if no filter, to preserve tree structure)
  const filteredNodes = useMemo(() => {
    if (!departmentFilter) return nodes;
    // When filtering, include matched nodes and their ancestors to preserve tree structure
    const matchedIds = new Set(nodes.filter(n => n.department === departmentFilter).map(n => n.id));
    // Add all ancestors of matched nodes
    const withAncestors = new Set(matchedIds);
    matchedIds.forEach(id => {
      let current = nodes.find(n => n.id === id);
      const visited = new Set<string>();
      while (current?.parentId && !visited.has(current.parentId)) {
        visited.add(current.parentId);
        withAncestors.add(current.parentId);
        current = nodes.find(n => n.id === current!.parentId);
      }
    });
    return nodes.filter(n => withAncestors.has(n.id));
  }, [nodes, departmentFilter]);

  const tree = useMemo(() => buildTree(filteredNodes), [filteredNodes]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  const resetZoom = () => setZoom(1);

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
    const found = nodes.find(n => n.name.toLowerCase().includes(term.toLowerCase()) || n.role.toLowerCase().includes(term.toLowerCase()));

    if (found) {
      setHighlightedId(found.id);
      // Expand parents path
      const toExpand = new Set<string>();
      let curr = found;
      while (curr.parentId) {
        toExpand.add(curr.parentId);
        const parent = nodes.find(n => n.id === curr.parentId);
        if (!parent) break;
        curr = parent;
      }

      // Remove found parents from collapsed set to ensure visibility
      setCollapsedNodes(prev => {
        const next = new Set(prev);
        toExpand.forEach(id => next.delete(id));
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

  const handleSave = () => {
    if (!inputName || !inputRole) return;

    if (modalState.type === 'add') {
      if (!inputEmail) return; // Email is required for new employees
      const newNode = {
        id: Date.now().toString(),
        parentId: inputParentId || modalState.nodeId,
        name: inputName,
        role: inputRole,
        email: inputEmail,
        department: inputDepartment,
        avatar: inputAvatar,
      };
      addNode(newNode);
    } else if (modalState.type === 'edit' && modalState.nodeId) {
      updateNode(modalState.nodeId, {
        name: inputName,
        role: inputRole,
        department: inputDepartment,
        avatar: inputAvatar,
        parentId: inputParentId || null // Allow null for root
      });
    }

    setModalState({ ...modalState, isOpen: false });
  };

  // Get available parents for the dropdown (exclude self and descendants to prevent cycles)
  const availableParents = useMemo(() => {
    if (modalState.type === 'add') return nodes;
    if (!modalState.nodeId) return nodes;

    const descendants = getDescendants(modalState.nodeId, nodes);
    return nodes.filter(n => n.id !== modalState.nodeId && !descendants.includes(n.id));
  }, [nodes, modalState]);

  // Recursive Tree Component
  const TreeNode: React.FC<{ node: OrgNode }> = ({ node }) => {
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isHighlighted = node.id === highlightedId;

    return (
      <div className="flex flex-col items-center">
        <div className="group relative z-10">
          {/* Card */}
          <div
            className={`flex flex-col items-center bg-card-light dark:bg-card-dark border transition-all rounded-xl p-4 w-52 shadow-sm ${isHighlighted
              ? 'ring-4 ring-primary border-primary scale-105'
              : 'border-border-light dark:border-border-dark'
              } ${isAdmin ? 'hover:shadow-lg hover:border-primary/50' : ''}`}
          >
            {/* Avatar with status indicator */}
            <div className="relative mb-3">
              <img src={node.avatar} alt={node.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" />
              {node.status && (
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                    node.status === 'Active' ? 'bg-green-500' : node.status === 'On Leave' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`}
                  title={node.status}
                ></span>
              )}
            </div>
            <h3 className="font-bold text-sm text-text-light dark:text-text-dark text-center">{node.name}</h3>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center">{node.role}</p>

            {/* Department badge */}
            {node.department && (
              <span className="mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {node.department}
              </span>
            )}

            {/* Direct report count */}
            {(node.directReportCount !== undefined && node.directReportCount > 0) && (
              <div
                className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted-light dark:text-text-muted-dark cursor-pointer hover:text-primary transition-colors"
                onClick={(e) => { e.stopPropagation(); fetchSubTree(node.id); }}
                title={`View ${node.directReportCount} direct report${node.directReportCount > 1 ? 's' : ''}`}
              >
                <Users size={10} />
                <span>{node.directReportCount} report{node.directReportCount > 1 ? 's' : ''}</span>
              </div>
            )}

            {hasChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                className="mt-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light transition-colors"
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
          </div>

          {/* Hover Actions - ADMIN ONLY */}
          {isAdmin && (
            <div className="absolute -right-3 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-card-dark shadow-lg rounded-lg p-1 border border-border-light dark:border-border-dark z-20">
              <button onClick={() => openEditModal(node)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500" title="Edit">
                <Edit2 size={14} />
              </button>
              <button onClick={() => openAddModal(node.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-green-500" title="Add Subordinate">
                <Plus size={14} />
              </button>
              {!node.parentId ? null : ( // Prevent deleting root easily
                <button onClick={() => handleDelete(node.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500" title="Delete">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Children Rendering with Connectors */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Vertical Line from Parent */}
            <div className="w-px h-8 bg-border-light dark:bg-border-dark"></div>

            <div className="flex gap-8 relative">
              {/* Horizontal Bar to connect children */}
              {node.children!.length > 1 && (
                <div className="absolute top-0 left-0 right-0 h-px bg-border-light dark:bg-border-dark translate-y-0"
                  style={{
                    left: `calc(${100 / (node.children!.length * 2)}%)`,
                    right: `calc(${100 / (node.children!.length * 2)}%)`
                  }}
                ></div>
              )}

              {node.children!.map((child) => (
                <div key={child.id} className="flex flex-col items-center relative">
                  {/* Vertical Line to Child */}
                  <div className="w-px h-8 bg-border-light dark:bg-border-dark"></div>
                  <TreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder line if collapsed to show continuity hint */}
        {hasChildren && isCollapsed && (
          <div className="w-px h-4 bg-dashed bg-border-light dark:bg-border-dark"></div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Organizational Structure</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
            {isAdmin ? 'Hover over cards to add, edit or remove people.' : 'View the company hierarchy.'}
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
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={14} />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-8 pr-8 py-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
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

      <div className="flex-grow bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-8 overflow-auto relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:16px_16px]">
        <div
          className="flex justify-center min-w-max pt-8 transition-transform origin-top duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {tree.map(root => <TreeNode key={root.id} node={root} />)}
        </div>
      </div>

      {/* Edit/Add Modal - Render only if open (and triggered by admin) */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                {modalState.type === 'add' ? 'Add New Position' : 'Edit Position'}
              </h3>
              <button onClick={() => setModalState({ ...modalState, isOpen: false })} className="text-text-muted-light hover:text-text-light">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Name</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  placeholder="Employee Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role / Job Title</label>
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
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
                <select
                  value={inputDepartment}
                  onChange={(e) => setInputDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark appearance-none"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {modalState.type === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reports To</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    <select
                      value={inputParentId || ''}
                      onChange={(e) => setInputParentId(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark appearance-none"
                    >
                      <option value="">No Manager (Root Node)</option>
                      {availableParents.map(parent => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name} ({parent.role})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted-light mt-1">Change to reassign this employee's manager.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Avatar URL</label>
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
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
                Remove from Org Chart?
              </h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                This will remove this person and all their direct reports from the organization chart.
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
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};