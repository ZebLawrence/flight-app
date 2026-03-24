'use client';

import { useState, useRef } from 'react';
import { Upload, Copy, Trash2, FileIcon, Check } from 'lucide-react';
import type { Media } from '@/lib/db/queries/media';

interface MediaLibraryProps {
  tenantId: string;
  initialMedia: Media[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export default function MediaLibrary({ tenantId, initialMedia }: MediaLibraryProps) {
  const [mediaItems, setMediaItems] = useState<Media[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tenantId', tenantId);

        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Upload failed');
        }

        const newItem: Media = await res.json();
        setMediaItems((prev) => [newItem, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleCopyUrl(item: Media) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Failed to copy URL to clipboard');
    }
  }

  async function handleDelete(item: Media) {
    if (!confirm(`Delete "${item.filename}"?`)) return;

    setDeletingId(item.id);
    setError('');

    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Delete failed');
      }

      setMediaItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mb-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-10 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drag and drop files here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:underline focus:outline-none"
              disabled={uploading}
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-gray-500">Upload images or other files</p>
        </div>
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Uploading…
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Media Grid */}
      {mediaItems.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">
          No media uploaded yet. Drag and drop files above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              {/* Thumbnail */}
              <div className="aspect-square w-full overflow-hidden bg-gray-100">
                {isImage(item.mimeType) ? (
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileIcon className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Overlay actions */}
              <div className="absolute inset-0 flex items-end justify-end gap-1 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(item)}
                  title="Copy URL"
                  className="flex h-7 w-7 items-center justify-center rounded bg-white/90 shadow hover:bg-white"
                >
                  {copiedId === item.id ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-700" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  title="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded bg-white/90 shadow hover:bg-white disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </button>
              </div>

              {/* File info */}
              <div className="px-2 py-1.5">
                <p className="truncate text-xs font-medium text-gray-700">{item.filename}</p>
                <p className="text-xs text-gray-400">{formatBytes(item.sizeBytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
