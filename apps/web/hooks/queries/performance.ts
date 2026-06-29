import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { PerformanceReview, JobHistoryItem, PeerFeedback, PeerFeedbackResponse } from '../../types';

export const useJobHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.jobHistory.byEmployee(id!),
    queryFn: () => api.get<JobHistoryItem[]>(`/job-history?employeeId=${id}`),
    enabled: !!id,
  });
};

export const useUpdateJobHistory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobHistoryItem> }) =>
      api.put<JobHistoryItem>(`/job-history/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobHistory.all });
    },
  });
};

export const useDeleteJobHistory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/job-history/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobHistory.all });
    },
  });
};

export const usePerformanceReviews = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.performanceReviews.byEmployee(id!),
    queryFn: () => api.get<PerformanceReview[]>(`/performance/reviews?employeeId=${id}`),
    enabled: !!id,
  });
};

export const useAllPerformanceReviews = (filters?: { status?: string; reviewPeriod?: string }) => {
  return useQuery({
    queryKey: queryKeys.performanceReviews.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.reviewPeriod) params.set('reviewPeriod', filters.reviewPeriod);
      return api.get<PerformanceReview[]>(`/performance/reviews?${params.toString()}`);
    },
    staleTime: 30000,
  });
};

export const useCreateSelfReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { selfReview: string; reviewPeriod?: string }) =>
      api.post<PerformanceReview>('/performance/reviews/self', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useSubmitSelfReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<PerformanceReview>(`/performance/reviews/${id}/submit`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useManagerReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, managerComment }: { id: string; rating: number; managerComment: string }) =>
      api.put<PerformanceReview>(`/performance/reviews/${id}/manager-review`, { rating, managerComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useHrApproveReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hrComment }: { id: string; hrComment?: string }) =>
      api.put<PerformanceReview>(`/performance/reviews/${id}/hr-approve`, { hrComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useRejectReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.put<PerformanceReview>(`/performance/reviews/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

// ── 360-degree peer review ──────────────────────────────────────────────────

export const usePeerFeedback = (reviewId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.performanceReviews.peerFeedback(reviewId!),
    queryFn: () => api.get<PeerFeedbackResponse>(`/performance/reviews/${reviewId}/peer-feedback`),
    enabled: !!reviewId && enabled,
    staleTime: 30000,
  });
};

export const useRequestPeerReviews = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, peerEmployeeIds }: { reviewId: string; peerEmployeeIds: string[] }) =>
      api.post<PeerFeedback[]>(`/performance/reviews/${reviewId}/peer-feedback/request`, { peerEmployeeIds }),
    onSuccess: (_data, { reviewId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.peerFeedback(reviewId) });
    },
  });
};

export const useSubmitPeerFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, rating, feedback, isAnonymous }: { reviewId: string; rating: number; feedback?: string; isAnonymous?: boolean }) =>
      api.post<PeerFeedback>(`/performance/reviews/${reviewId}/peer-feedback`, { rating, feedback, isAnonymous }),
    onSuccess: (_data, { reviewId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.peerFeedback(reviewId) });
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};
