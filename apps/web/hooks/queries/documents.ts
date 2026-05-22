import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { DocumentItem, PaginatedResponse } from '../../types';
import { DocumentListFilters } from './_shared';

interface StorageInfo {
  used: number;
  total: number;
  percentage: number;
}

export const useDocumentList = (filters: DocumentListFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.type && filters.type !== 'All') params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      const qs = params.toString();
      return api.get<PaginatedResponse<DocumentItem>>(qs ? `/documents?${qs}` : '/documents');
    },
  });
};

export const useDocumentTrash = () => {
  return useQuery({
    queryKey: queryKeys.documents.trash(),
    queryFn: () => api.get<DocumentItem[]>('/documents/trash'),
  });
};

export const useDocumentStorage = () => {
  return useQuery({
    queryKey: queryKeys.documents.storage(),
    queryFn: () => api.get<StorageInfo>('/documents/storage'),
  });
};

export const useDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

export const useRestoreDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

export const usePermanentDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

