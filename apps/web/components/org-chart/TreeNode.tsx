import React from 'react';
import type { TFunction } from 'i18next';
import { Plus, Edit2, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { OrgNode, AvailabilityStatus } from '../../types';
import { StatusIndicator } from '../StatusIndicator';
import { AvatarWithFallback } from './AvatarWithFallback';

export interface TreeNodeProps {
  node: OrgNode;
  isRoot?: boolean;
  isAdmin: boolean;
  collapsedNodes: Set<string>;
  highlightedId: string | null;
  draggedNodeId: string | null;
  dragOverNodeId: string | null;
  isValidDrop: (draggedId: string, targetId: string) => boolean;
  getAvailabilityStatus: (employeeId: string) => AvailabilityStatus;
  t: TFunction;
  handleDragStart: (e: React.DragEvent, nodeId: string) => void;
  handleDragOver: (e: React.DragEvent, targetId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;
  handleDragEnd: () => void;
  toggleCollapse: (id: string) => void;
  fetchSubTree: (id: string) => void;
  openEditModal: (node: OrgNode) => void;
  openAddModal: (parentId: string) => void;
  handleDelete: (id: string) => void;
}

// Recursive Tree Component with visual tree connectors
export const TreeNode: React.FC<TreeNodeProps> = (props) => {
  const {
    node,
    isRoot = false,
    isAdmin,
    collapsedNodes,
    highlightedId,
    draggedNodeId,
    dragOverNodeId,
    isValidDrop,
    getAvailabilityStatus,
    t,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    toggleCollapse,
    fetchSubTree,
    openEditModal,
    openAddModal,
    handleDelete,
  } = props;

  const isCollapsed = collapsedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = node.id === highlightedId;
  const childCount = node.children?.length || 0;

  // Drag & drop state for this card
  const isDragging = draggedNodeId === node.id;
  const isDragOver = dragOverNodeId === node.id && draggedNodeId !== null;
  const canDrop = isDragOver && draggedNodeId !== null && isValidDrop(draggedNodeId, node.id);
  const isOrphan = !node.parentId && (!node.children || node.children.length === 0);
  const isDraggable = isAdmin && (!!node.parentId || isOrphan);

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
          className={`flex flex-col items-center bg-card-light dark:bg-card-dark border transition-all duration-200 rounded-xl p-3 md:p-4 w-40 md:w-52 ${
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
          {/* Avatar with fallback and availability status indicator */}
          <div className="relative mb-3">
            <AvatarWithFallback src={node.avatar} name={node.name} size="md" isRoot={isRoot} />
            <StatusIndicator
              status={getAvailabilityStatus(node.id)}
              showTooltip
              size="md"
              className="absolute -bottom-0.5 -right-0.5"
            />
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
              title={node.directReportCount > 1 ? t('orgChart.reports', { count: node.directReportCount }) : t('orgChart.report', { count: node.directReportCount })}
            >
              <Users size={10} />
              <span>
                {node.directReportCount > 1 ? t('orgChart.reports', { count: node.directReportCount }) : t('orgChart.report', { count: node.directReportCount })}
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
              title={t('orgChart.edit')}
              aria-label={t('orgChart.edit')}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => openAddModal(node.id)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-green-500"
              title={t('orgChart.addSubordinate')}
              aria-label={t('orgChart.addSubordinate')}
            >
              <Plus size={14} />
            </button>
            {!node.parentId ? null : (
              <button
                onClick={() => handleDelete(node.id)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                title={t('orgChart.delete')}
                aria-label={t('orgChart.delete')}
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
              <div key={child.id} className="flex flex-col items-center px-2 md:px-4 relative">
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
                <TreeNode {...props} node={child} isRoot={false} />
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
