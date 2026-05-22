import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { SurveyListItem, SurveyDetail, SentimentOverview } from '../../types';

export const useSurveyList = () => {
  return useQuery({
    queryKey: queryKeys.surveys.list(),
    queryFn: () => api.get<SurveyListItem[]>('/surveys'),
  });
};

export const useSurveyDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveys.detail(id!),
    queryFn: () => api.get<SurveyDetail>(`/surveys/${id}`),
    enabled: !!id,
  });
};

export const useSentimentOverview = () => {
  return useQuery({
    queryKey: queryKeys.surveys.sentiment(),
    queryFn: () => api.get<SentimentOverview>('/surveys/sentiment'),
  });
};

export const useCreateSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; questions: Array<{ questionText: string; category: string; sortOrder: number }>; allowRetake?: boolean }) =>
      api.post('/surveys', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useSubmitSurveyResponse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ surveyId, responses }: { surveyId: string; responses: Array<{ questionId: string; rating: number }> }) =>
      api.post(`/surveys/${surveyId}/respond`, { responses }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useCloseSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/surveys/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useReopenSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/surveys/${id}/reopen`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useDeleteSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/surveys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};
