import { useQuery } from '@tanstack/react-query';
import { schoolsApi } from '@/api/schools';
import type { SchoolSearchParams } from '@/lib/types';
import { getAccessToken } from '@/lib/auth';

export function useSchoolSearch(params: SchoolSearchParams) {
  return useQuery({
    queryKey: ['schools', 'search', params],
    queryFn: () => schoolsApi.search(params),
    enabled: !!getAccessToken(),
  });
}

export function useSchool(id: string | undefined) {
  return useQuery({
    queryKey: ['schools', id],
    queryFn: () => schoolsApi.getById(id!),
    enabled: !!id && !!getAccessToken(),
  });
}

export function useResolveEmbed(token: string | undefined) {
  return useQuery({
    queryKey: ['schools', 'embed', token],
    queryFn: () => schoolsApi.resolveEmbed(token!),
    enabled: !!token,
    retry: false,
  });
}
