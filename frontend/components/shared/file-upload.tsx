'use client';

import { useRef, useState } from 'react';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  maxSizeMb?: number;
  uploading?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  label?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  accept = '.pdf,.doc,.docx',
  maxSizeMb = 5,
  uploading,
  onUpload,
  label = 'Upload a file',
  hint,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File must be under ${maxSizeMb} MB`);
      return;
    }
    setError(null);
    setSelected(file);
    onUpload(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
        )}
      >
        {uploading ? (
          <Spinner className="h-6 w-6" />
        ) : (
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <Upload className="h-5 w-5" />
          </div>
        )}
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          Drag & drop or click — max {maxSizeMb} MB
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {selected && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <FileIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{selected.name}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSelected(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
