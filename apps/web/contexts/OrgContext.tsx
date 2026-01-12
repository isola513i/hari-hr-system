import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OrgNode } from '../types';
import { INITIAL_ORG_DATA } from '../constants';

interface OrgContextType {
    nodes: OrgNode[];
    addNode: (node: any) => void;
    updateNode: (id: string, updates: Partial<OrgNode>) => void;
    deleteNode: (id: string) => void;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

import { useEffect } from 'react';

export const OrgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [nodes, setNodes] = useState<OrgNode[]>([]); // Start empty, fetch from API

    const fetchNodes = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/org-chart');
            if (response.ok) {
                const data = await response.json();
                setNodes(data);
            } else {
                console.error('Failed to fetch org chart');
                setNodes(INITIAL_ORG_DATA); // Fallback
            }
        } catch (error) {
            console.error('Error fetching org chart:', error);
            setNodes(INITIAL_ORG_DATA); // Fallback
        }
    };

    useEffect(() => {
        fetchNodes();
    }, []);

    const addNode = async (nodeData: any) => {
        // nodeData comes from Onboarding form, needs to be mapped to API payload
        // API expects: { name, email, role, department, managerId, joinDate }
        // Onboarding passes: { name, email, role, department, startDate, parentId... }

        try {
            const payload = {
                name: nodeData.name,
                email: nodeData.email,
                role: nodeData.role,
                department: nodeData.department,
                managerId: nodeData.parentId || '2', // Default to David Lee if null
                joinDate: nodeData.startDate || new Date().toISOString()
            };

            const response = await fetch('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Re-fetch to update the chart with the new node and its correct DB ID
                fetchNodes();
            } else {
                console.error('Failed to add employee via API');
                // Optimistic update fallback? No, better to alert.
                // For legacy compatibility, we might just append to local state if API fails?
                // But let's stick to API first.
                // If API fails, we could alert, but we don't have good error handling UI here.
            }
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
