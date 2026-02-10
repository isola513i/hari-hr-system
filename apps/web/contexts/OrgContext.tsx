import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { OrgNode } from '@hari/shared-types';
import {
  useOrgChart,
  useAddOrgNode,
  useUpdateOrgNode,
  useDeleteOrgNode,
} from '../hooks/queries';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

interface OrgContextType {
    nodes: OrgNode[];
    addNode: (node: any) => void;
    updateNode: (id: string, updates: Partial<OrgNode>) => void;
    deleteNode: (id: string) => void;
    fetchSubTree: (employeeId: string) => void;
    fetchAllNodes: () => void;
    isSubTreeView: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSubTreeView, setIsSubTreeView] = useState(false);
    const [subtreeNodes, setSubtreeNodes] = useState<OrgNode[] | null>(null);

    const { data: allNodes = [] } = useOrgChart();
    const addNodeMutation = useAddOrgNode();
    const updateNodeMutation = useUpdateOrgNode();
    const deleteNodeMutation = useDeleteOrgNode();
    const qc = useQueryClient();

    // When in subtree view, show subtree nodes; otherwise show all nodes
    const nodes = isSubTreeView && subtreeNodes ? subtreeNodes : allNodes;

    const fetchSubTree = useCallback(async (employeeId: string) => {
        try {
            const data = await api.get<OrgNode[]>(`/org-chart/subtree/${employeeId}`);
            setSubtreeNodes(data);
            setIsSubTreeView(true);
        } catch (error) {
            console.error('Error fetching org chart subtree:', error);
        }
    }, []);

    const fetchAllNodes = useCallback(() => {
        setIsSubTreeView(false);
        setSubtreeNodes(null);
        qc.invalidateQueries({ queryKey: queryKeys.orgChart.tree() });
    }, [qc]);

    const addNode = useCallback(async (nodeData: any) => {
        try {
            const payload = {
                name: nodeData.name,
                email: nodeData.email,
                role: nodeData.role,
                department: nodeData.department,
                managerId: nodeData.parentId || '2',
                joinDate: nodeData.startDate || new Date().toISOString(),
            };
            await addNodeMutation.mutateAsync(payload);
        } catch (error) {
            console.error('Error adding employee:', error);
        }
    }, [addNodeMutation]);

    const updateNode = useCallback(async (id: string, updates: Partial<OrgNode>) => {
        try {
            const payload: any = {};
            if (updates.name) payload.name = updates.name;
            if (updates.role) payload.role = updates.role;
            if (updates.department !== undefined) payload.department = updates.department;
            if (updates.avatar) payload.avatar = updates.avatar;
            if ('parentId' in updates) payload.managerId = updates.parentId || null;

            await updateNodeMutation.mutateAsync({ id, data: payload });
        } catch (error) {
            console.error('Error updating node:', error);
            throw error;
        }
    }, [updateNodeMutation]);

    const deleteNode = useCallback(async (id: string) => {
        try {
            await deleteNodeMutation.mutateAsync(id);
        } catch (error) {
            console.error('Error deleting node:', error);
        }
    }, [deleteNodeMutation]);

    return (
        <OrgContext.Provider value={{ nodes, addNode, updateNode, deleteNode, fetchSubTree, fetchAllNodes, isSubTreeView }}>
            {children}
        </OrgContext.Provider>
    );
};

export const useOrg = () => {
    const context = useContext(OrgContext);
    if (!context) {
        throw new Error('useOrg must be used within an OrgProvider');
    }
    return context;
};
