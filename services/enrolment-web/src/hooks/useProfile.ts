import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parentsApi } from '@/api/parents';
import type { ProfileUpdatePayload } from '@/lib/types';
import { getAccessToken, getUserRole } from '@/lib/auth';

export function useProfile() {
  const queryClient = useQueryClient();
  const enabled = getUserRole() === 'parent' && !!getAccessToken();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: parentsApi.getProfile,
    enabled,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ProfileUpdatePayload) =>
      parentsApi.updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
    },
  });

  const uploadIdProofMutation = useMutation({
    mutationFn: (file: File) => parentsApi.uploadIdProof(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    updateProfile: updateMutation,
    uploadIdProof: uploadIdProofMutation,
    isComplete: profileQuery.data?.profile_complete ?? false,
  };
}

export function useDashboard() {
  const enabled = getUserRole() === 'parent' && !!getAccessToken();

  return useQuery({
    queryKey: ['dashboard'],
    queryFn: parentsApi.getDashboard,
    enabled,
  });
}
