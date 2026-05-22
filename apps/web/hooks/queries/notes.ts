import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

interface Note {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useNotes = () => {
  return useQuery({
    queryKey: queryKeys.notes.list(),
    queryFn: () => api.get<Note[]>('/notes'),
  });
};

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string }) => api.post('/notes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};

export const useUpdateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => api.patch(`/notes/${id}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};

export const useDeleteNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};

export const useToggleNotePin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/notes/${id}/toggle-pin`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};
