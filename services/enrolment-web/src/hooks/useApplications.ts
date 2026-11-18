import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { staffApi } from '@/api/staff';
import type {
  ApprovePayload,
  CreateApplicationPayload,
  RejectPayload,
  RequestInfoPayload,
  RespondInfoPayload,
} from '@/lib/types';
import { getAccessToken, getUserRole } from '@/lib/auth';

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.list,
    enabled: getUserRole() === 'parent' && !!getAccessToken(),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationsApi.getById(id!),
    enabled: !!id && !!getAccessToken(),
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApplicationPayload) =>
      applicationsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      document_type,
    }: {
      id: string;
      file: File;
      document_type: string;
    }) => applicationsApi.uploadDocument(id, file, document_type),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['applications', vars.id] });
    },
  });
}

export function useRespondInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      files,
    }: {
      id: string;
      payload: RespondInfoPayload;
      files?: File[];
    }) => applicationsApi.respondInfo(id, payload, files),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['applications', vars.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useStaffApplications(status?: string) {
  return useQuery({
    queryKey: ['staff', 'applications', status ?? 'all'],
    queryFn: () => staffApi.listApplications(status),
    enabled: getUserRole() === 'staff' && !!getAccessToken(),
  });
}

export function useStaffApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['staff', 'applications', id],
    queryFn: () => staffApi.getApplication(id!),
    enabled: !!id && getUserRole() === 'staff' && !!getAccessToken(),
  });
}

export function useStaffActions() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff', 'applications'] });
  };

  const approve = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApprovePayload }) =>
      staffApi.approve(id, payload),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectPayload }) =>
      staffApi.reject(id, payload),
    onSuccess: invalidate,
  });

  const requestInfo = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: RequestInfoPayload;
    }) => staffApi.requestInfo(id, payload),
    onSuccess: invalidate,
  });

  return { approve, reject, requestInfo };
}
