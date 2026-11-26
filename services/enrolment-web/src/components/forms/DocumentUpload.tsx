import { useEffect, useRef, useState } from 'react';
import { FileUp, X, CheckCircle2, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface DocumentUploadProps {
  label: string;
  required?: boolean;
  accept?: string;
  maxSizeMb?: number;
  value?: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function DocumentUpload({
  label,
  required,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMb = 5,
  value,
  existingUrl,
  onChange,
  error,
  disabled,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value && isImageFile(value)) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [value]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    const allowedTypes = accept
      .split(',')
      .map((t) => t.trim().toLowerCase());
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeMatch = allowedTypes.some(
      (t) => t === ext || file.type.includes(t.replace('.', '')),
    );
    if (!mimeMatch) {
      setLocalError(`Invalid file type. Accepted: ${accept}`);
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`File must be under ${maxSizeMb} MB (yours: ${formatFileSize(file.size)})`);
      return;
    }
    setLocalError(null);
    onChange(file);
  };

  const displayError = error || localError;

  return (
    <div className="w-full">
      <p className="field-label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {!required && (
          <span className="ml-1 text-xs font-normal text-slate-400">(Optional)</span>
        )}
      </p>
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 transition',
          !disabled && 'hover:border-brand-400 hover:bg-brand-50/30',
          displayError && 'border-red-400',
          disabled && 'opacity-60',
        )}
      >
        {value || existingUrl ? (
          <div className="space-y-3">
            {preview && (
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-24 w-24 rounded-lg object-cover border border-slate-200 shadow-sm"
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                {value && isImageFile(value) ? (
                  <ImageIcon className="h-5 w-5 shrink-0 text-brand-500" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-brand-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {value?.name || 'Document uploaded'}
                  </p>
                  {value && (
                    <p className="text-xs text-slate-400">
                      {value.type.split('/').pop()?.toUpperCase()} · {formatFileSize(value.size)}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 py-2 text-sm text-slate-600"
          >
            <FileUp className="h-8 w-8 text-brand-600" />
            <span>
              <span className="font-medium text-brand-700">Choose file</span> or
              drag and drop
            </span>
            <span className="text-xs text-slate-400">
              PDF, JPG, PNG · max {maxSizeMb} MB
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {displayError && <p className="field-error">{displayError}</p>}
    </div>
  );
}
