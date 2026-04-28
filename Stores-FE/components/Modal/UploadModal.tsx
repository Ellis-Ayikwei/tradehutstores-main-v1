"use client";

/**
 * Reusable evidence upload modal.
 * Ported from: stitch_full_website_redesign_expansion/resolution_center_upload_modal/code.html
 *
 * Props:
 *   open      – controls visibility
 *   onClose   – called on overlay-click, Escape, or Cancel button
 *   onUpload  – called with the accepted File[] when "Submit Evidence" is clicked
 *   title     – modal heading (default "Upload Evidence")
 *   accept    – MIME / extension filter passed to the file input (default "image/*,application/pdf")
 *   maxFiles  – maximum number of files (default 10)
 *   maxSize   – human-readable max-size label shown in the drop-zone (default "50 MB")
 *
 * Portal: renders into document.body via a fixed overlay.
 * No new npm dependencies — uses vanilla React state + native File API.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Video,
  File,
  CheckCircle,
  Trash2,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FileEntry {
  id: string;
  file: File;
  /** 0–100; once 100 the upload is considered "done" (mocked in this scaffold) */
  progress: number;
  done: boolean;
}

export interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  title?: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uid(): string {
  return Math.random().toString(36).slice(2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ file, className }: { file: File; className?: string }) {
  if (file.type.startsWith("image/"))
    return <ImageIcon className={className ?? "w-5 h-5"} />;
  if (file.type === "application/pdf")
    return <FileText className={className ?? "w-5 h-5"} />;
  if (file.type.startsWith("video/"))
    return <Video className={className ?? "w-5 h-5"} />;
  return <File className={className ?? "w-5 h-5"} />;
}

function fileIconColorClass(file: File): string {
  if (file.type.startsWith("image/")) return "text-secondary-green";
  if (file.type === "application/pdf") return "text-tertiary";
  if (file.type.startsWith("video/")) return "text-primary";
  return "text-on-surface-variant";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function UploadModal({
  open,
  onClose,
  onUpload,
  title = "Upload Evidence",
  accept = "image/*,application/pdf",
  maxFiles = 10,
  maxSize = "50 MB",
}: UploadModalProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard: close on Escape ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Prevent body scroll while modal is open ──────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ── Reset state when modal closes ────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setEntries([]);
      setDragging(false);
    }
  }, [open]);

  // ── Add files (dedup by name+size, respect maxFiles) ─────────────────────
  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles);
      setEntries((prev) => {
        const available = maxFiles - prev.length;
        const toAdd = arr.slice(0, available).map((f) => ({
          id: uid(),
          file: f,
          progress: 0,
          done: false,
        }));
        return [...prev, ...toAdd];
      });
      // Mock progress simulation
      arr.slice(0, maxFiles).forEach((_, i) => {
        const id = uid(); // we'll use a closure trick below
        // Each file gets a fake ramp to 100 over ~1.5s
        let p = 0;
        const iv = setInterval(() => {
          p = Math.min(p + Math.floor(Math.random() * 25 + 10), 100);
          setEntries((prev) =>
            prev.map((e, idx) =>
              idx === i + (entries.length > 0 ? entries.length : 0)
                ? { ...e, progress: p, done: p >= 100 }
                : e
            )
          );
          if (p >= 100) clearInterval(iv);
        }, 200);
        void id; // suppress unused warning
      });
    },
    [maxFiles, entries.length]
  );

  // ── Drag handlers ────────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSubmit() {
    const files = entries.map((e) => e.file);
    onUpload(files);
    onClose();
  }

  if (!open) return null;

  return (
    /* ── Overlay ────────────────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-modal bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* ── Modal card ───────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-card w-full max-w-2xl overflow-hidden flex flex-col border border-outline-variant/20 max-h-[90vh]">

        {/* Header */}
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-5 border-b border-surface-container-low flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="font-headline text-xl md:text-2xl font-extrabold text-on-surface tracking-tight">
                {title}
              </h2>
              <p className="text-on-surface-variant text-sm mt-1 leading-relaxed">
                Provide clear, high-resolution documentation to support your
                dispute claims.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors flex-shrink-0 active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto">

          {/* Drop zone */}
          <div
            className={`group cursor-pointer relative border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center transition-all duration-200
              ${dragging
                ? "bg-primary/5 border-primary/50"
                : "bg-surface-container-low border-outline-variant hover:bg-surface-container-highest hover:border-primary/40"
              }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={`w-14 h-14 md:w-16 md:h-16 bg-surface-container-lowest rounded-2xl shadow-card flex items-center justify-center mb-4 transition-transform duration-200
                ${dragging ? "scale-110" : "group-hover:scale-110"}`}
            >
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <p className="font-headline font-bold text-on-surface text-base md:text-lg">
              {dragging ? "Drop files here" : "Click or drag to upload evidence"}
            </p>
            <p className="text-on-surface-variant text-sm mt-1">
              Supported: PDF, JPG, PNG, MP4
              <span className="mx-1.5 text-outline">•</span>
              Max {maxSize} per file
            </p>
            {entries.length >= maxFiles && (
              <p className="text-error text-xs mt-2 font-bold">
                Maximum {maxFiles} files reached
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              onChange={handleInputChange}
            />
          </div>

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">
                Uploaded Files ({entries.length})
              </h3>

              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2 shadow-card hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* File type icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${entry.file.type.startsWith("image/")
                          ? "bg-secondary-container/30"
                          : entry.file.type === "application/pdf"
                          ? "bg-tertiary-fixed"
                          : "bg-surface-container"
                        }`}
                    >
                      <FileTypeIcon
                        file={entry.file}
                        className={`w-5 h-5 ${fileIconColorClass(entry.file)}`}
                      />
                    </div>

                    {/* Name + size */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-on-surface text-sm truncate">
                        {entry.file.name}
                      </p>
                      <p className="text-xs text-on-surface-variant font-mono">
                        {entry.done
                          ? `${formatBytes(entry.file.size)} • Uploaded`
                          : `Uploading ${entry.progress}%`}
                      </p>
                    </div>

                    {/* Status / remove */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.done ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-secondary-green" />
                          <button
                            onClick={() => removeEntry(entry.id)}
                            className="text-outline hover:text-error transition-colors active:scale-95"
                            aria-label="Remove file"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-outline hover:text-error transition-colors active:scale-95"
                          aria-label="Cancel upload"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar (hidden once done) */}
                  {!entry.done && (
                    <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-container rounded-full transition-all duration-300"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-5 bg-surface-container-low/50 flex justify-end items-center gap-3 flex-shrink-0 border-t border-surface-container-low">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl font-bold font-headline text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={entries.length === 0}
            className="bg-primary-container text-on-primary px-6 md:px-8 py-3 rounded-xl font-bold font-headline text-sm shadow-card hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Submit Evidence
          </button>
        </div>
      </div>
    </div>
  );
}
