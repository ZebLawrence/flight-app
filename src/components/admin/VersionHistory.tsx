'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PageVersion } from '@/lib/db/schema';

interface VersionHistoryProps {
  pageId: string;
  onPreview: (content: string, title: string) => void;
  onRestore: (content: string, title: string) => void;
}

export default function VersionHistory({ pageId, onPreview, onRestore }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmVersion, setConfirmVersion] = useState<PageVersion | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/versions?limit=50`);
      if (!res.ok) throw new Error('Failed to load versions');
      const data = await res.json() as { data: PageVersion[]; total: number };
      setVersions(data.data);
    } catch {
      setError('Failed to load version history.');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (open) {
      void fetchVersions();
    }
  }, [open, fetchVersions]);

  const handlePreview = useCallback((version: PageVersion) => {
    onPreview(JSON.stringify(version.content, null, 2), version.title);
  }, [onPreview]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!confirmVersion) return;
    const versionToRestore = confirmVersion;
    setRestoring(versionToRestore.id);
    setConfirmVersion(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/versions/${versionToRestore.id}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to restore version');
      const page = await res.json() as { content: Record<string, unknown>; title: string };
      onRestore(JSON.stringify(page.content, null, 2), page.title);
      setOpen(false);
    } catch {
      setError('Failed to restore version. Please try again.');
    } finally {
      setRestoring(null);
    }
  }, [confirmVersion, pageId, onRestore]);

  return (
    <>
      {/* History toggle button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
      >
        History
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Version History"
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Version History</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close version history"
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <p className="text-sm text-gray-500">Loading…</p>
              )}

              {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
              )}

              {!loading && !error && versions.length === 0 && (
                <p className="text-sm text-gray-500">No previous versions found.</p>
              )}

              {!loading && versions.length > 0 && (
                <ul className="space-y-2">
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      className="rounded border border-gray-200 p-3"
                    >
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-700">
                          {new Date(version.createdAt).toLocaleString()}
                        </p>
                        {version.createdBy && (
                          <p className="text-xs text-gray-400 mt-0.5">{version.createdBy}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{version.title}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePreview(version)}
                          className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-gray-400"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmVersion(version)}
                          disabled={restoring === version.id}
                          className="flex-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {restoring === version.id ? 'Restoring…' : 'Restore'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmation dialog */}
      {confirmVersion && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm restore"
            className="fixed inset-0 flex items-center justify-center z-[70] p-4"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Restore this version?
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                This will overwrite the current content with the version from:
              </p>
              <p className="text-sm font-medium text-gray-800 mb-4">
                {new Date(confirmVersion.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                The current content will be saved as a version before restoring.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmVersion(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRestoreConfirm()}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
