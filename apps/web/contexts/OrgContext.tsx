import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrgNode } from '../types';
import { api } from '../lib/api';

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
    const [nodes, setNodes] = useState<OrgNode[]>([]);
    const [isSubTreeView, setIsSubTreeView] = useState(false);

    const fetchNodes = async () => {
        try {
            const data = await api.get<OrgNode[]>('/org-chart');
            setNodes(data);
        } catch (error) {
            console.error('Error fetching org chart:', error);
            setNodes([]);
        }
    };

    const fetchSubTree = async (employeeId: string) => {
        try {
            const data = await api.get<OrgNode[]>(`/org-chart/subtree/${employeeId}`);
            setNodes(data);
            setIsSubTreeView(true);
        } catch (error) {
            console.error('Error fetching org chart subtree:', error);
        }
    };

    const fetchAllNodes = () => {
        setIsSubTreeView(false);
        fetchNodes();
    };

    useEffect(() => {
        fetchNodes();
    }, []);

    const addNode = async (nodeData: any) => {
        try {
            const payload = {
                name: nodeData.name,
                email: nodeData.email,
                role: nodeData.role,
                department: nodeData.department,
                managerId: nodeData.parentId || '2',
                joinDate: nodeData.startDate || new Date().toISOString()
            };

            await api.post('/employees', payload);
            fetchNodes();

        } catch (error) {
            console.error('Error adding employee:', error);
        }
    };

    const updateNode = async (id: string, updates: Partial<OrgNode>) => {
        try {
            const payload: any = {};
            if (updates.name) payload.name = updates.name;
            if (updates.role) payload.role = updates.role;
            if (updates.department) payload.department = updates.department;
            if ('parentId' in updates) payload.managerId = updates.parentId || null;

            await api.patch(`/employees/${id}`, payload);
            fetchNodes();
        } catch (error) {
            console.error('Error updating node:', error);
        }
    };

    const deleteNode = async (id: string) => {
        try {
            await api.delete(`/employees/${id}?cascade=true`);
            fetchNodes();
        } catch (error) {
            console.error('Error deleting node:', error);
        }
    };

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
