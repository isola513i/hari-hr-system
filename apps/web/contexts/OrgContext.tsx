import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OrgNode } from '../types';
// Mocks removed

interface OrgContextType {
    nodes: OrgNode[];
    addNode: (node: any) => void;
    updateNode: (id: string, updates: Partial<OrgNode>) => void;
    deleteNode: (id: string) => void;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

import { useEffect } from 'react';
import { api } from '../lib/api';

export const OrgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [nodes, setNodes] = useState<OrgNode[]>([]); // Start empty, fetch from API



    // ...

    const fetchNodes = async () => {
        try {
            const data = await api.get<OrgNode[]>('/org-chart');
            setNodes(data);
        } catch (error) {
            console.error('Error fetching org chart:', error);
            setNodes([]);
        }
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

    const updateNode = (id: string, updates: Partial<OrgNode>) => {
        // Sync not implemented for update yet
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    // Helper to get descendants for recursive deletion
    const getDescendants = (parentId: string, allNodes: OrgNode[]): string[] => {
        const children = allNodes.filter(n => n.parentId === parentId);
        let descendants: string[] = children.map(c => c.id);
        children.forEach(c => {
            descendants = [...descendants, ...getDescendants(c.id, allNodes)];
        });
        return descendants;
    };

    const deleteNode = (id: string) => {
        // Sync not implemented for delete yet
        const idsToRemove = [id, ...getDescendants(id, nodes)];
        setNodes(prev => prev.filter(n => !idsToRemove.includes(n.id)));
    };

    return (
        <OrgContext.Provider value={{ nodes, addNode, updateNode, deleteNode }}>
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
