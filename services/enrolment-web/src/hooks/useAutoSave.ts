import { useEffect, useRef, useCallback } from 'react';
import { applicationsApi } from '@/api/applications';
import type { ApplicationFormData } from '@/lib/types';

interface UseAutoSaveOptions {
  applicationId: string | undefined;
  formData: Partial<ApplicationFormData>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave({
  applicationId,
  formData,
  enabled = true,
  debounceMs = 3000,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (!applicationId || !enabled || isSavingRef.current) return;

    const serialized = JSON.stringify(formData);
    if (serialized === lastSavedRef.current) return;

    isSavingRef.current = true;
    try {
      await applicationsApi.update(applicationId, formData as ApplicationFormData);
      lastSavedRef.current = serialized;
    } catch {
      // silent — auto-save is best-effort
    } finally {
      isSavingRef.current = false;
    }
  }, [applicationId, formData, enabled]);

  useEffect(() => {
    if (!applicationId || !enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [save, debounceMs, applicationId, enabled]);

  return { saveNow: save };
}
