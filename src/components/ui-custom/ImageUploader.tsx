"use client";

/**
 * ImageUploader
 * Componente reutilizable para subir imágenes a Supabase Storage.
 * Soporta: drag & drop, click-to-select, preview, replace, eliminar.
 * Muestra un ring de progreso mientras sube.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  faUpload, faXmark, faImage, faSpinner, faRotate, faMagnifyingGlassPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImageUploaderProps {
  /** Current image URL (from DB). Pass null if no image yet. */
  value:         string | null;
  /** Called with the new public URL after upload, or null after delete. */
  onChange:      (url: string | null) => void;
  /** Supabase Storage bucket name */
  bucket?:       string;
  /** Path prefix inside bucket, e.g. org ID */
  folder?:       string;
  /** Max file size in bytes (default 5 MB) */
  maxBytes?:     number;
  /** Optional className for the container */
  className?:    string;
  disabled?:     boolean;
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ progress }: { progress: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress / 100)}
        strokeLinecap="round"
        className="transition-all duration-200"
      />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ImageUploader({
  value,
  onChange,
  bucket    = "inventory-images",
  folder    = "general",
  maxBytes  = 5 * 1024 * 1024,
  className,
  disabled  = false,
}: ImageUploaderProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [preview,   setPreview]   = useState<string | null>(null); // local blob URL
  const [zoomed,    setZoomed]    = useState(false);

  const displayUrl = preview ?? value;

  // ── Upload logic ──────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > maxBytes) {
      toast.error(`Imagen demasiado grande (máx. ${Math.round(maxBytes / 1024 / 1024)} MB)`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP)");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    setProgress(10);

    try {
      const supabase = createClient();
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setProgress(30);

      // Delete old file if exists and is from our bucket
      if (value) {
        const oldPath = extractPathFromUrl(value, bucket);
        if (oldPath) {
          await supabase.storage.from(bucket).remove([oldPath]);
        }
      }

      setProgress(50);

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      setProgress(80);

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      setProgress(100);
      onChange(publicUrl);
      toast.success("Imagen subida correctamente");
    } catch (err) {
      toast.error("Error al subir imagen: " + (err as Error).message);
      setPreview(null);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [bucket, folder, maxBytes, onChange, value]);

  // ── Delete logic ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) { setPreview(null); onChange(null); return; }

    const supabase = createClient();
    const path = extractPathFromUrl(value, bucket);
    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }
    setPreview(null);
    onChange(null);
    toast.success("Imagen eliminada");
  }, [bucket, onChange, value]);

  // ── Drop handlers ─────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [disabled, uploadFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={cn(
          "relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200 select-none",
          displayUrl
            ? "border-border/40 aspect-square"
            : "aspect-square flex flex-col items-center justify-center gap-3",
          dragging && !displayUrl && "border-primary bg-primary/5 scale-[1.01]",
          !displayUrl && !dragging && "border-border/50 hover:border-primary/40 hover:bg-muted/20",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        onClick={() => !displayUrl && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />

        {/* ── Empty state ── */}
        {!displayUrl && !uploading && (
          <>
            <div className={cn(
              "flex size-12 items-center justify-center rounded-2xl transition-colors",
              dragging ? "bg-primary/20" : "bg-muted/40"
            )}>
              <FaIcon icon={faImage} size={22} className={dragging ? "text-primary" : "text-muted-foreground/60"} />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-medium text-muted-foreground">
                {dragging ? "Suelta la imagen" : "Arrastra o haz clic"}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                JPG · PNG · WebP · máx. {Math.round(maxBytes / 1024 / 1024)} MB
              </p>
            </div>
          </>
        )}

        {/* ── Uploading state ── */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-2">
            <div className="relative size-14 flex items-center justify-center">
              <ProgressRing progress={progress} />
              <span className="text-xs font-bold z-10">{progress}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <FaIcon icon={faSpinner} size={10} className="animate-spin" /> Subiendo...
            </p>
          </div>
        )}

        {/* ── Image preview ── */}
        {displayUrl && !uploading && (
          <>
            <Image
              src={displayUrl}
              alt="Imagen del ítem"
              fill
              className="object-cover"
              sizes="300px"
              unoptimized
            />

            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-all duration-200 group flex items-center justify-center gap-2">
              {/* Zoom */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
              >
                <FaIcon icon={faMagnifyingGlassPlus} size={14} />
              </button>

              {/* Replace */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
              >
                <FaIcon icon={faRotate} size={14} />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex size-8 items-center justify-center rounded-full bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm text-white"
              >
                <FaIcon icon={faXmark} size={14} />
              </button>
            </div>

            {/* Upload indicator bottom strip */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white/80 flex items-center gap-1">
                <FaIcon icon={faUpload} size={9} /> Reemplazar
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Zoom modal ── */}
      {zoomed && displayUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <div className="relative max-w-lg w-full max-h-[80vh] rounded-2xl overflow-hidden">
            <Image
              src={displayUrl}
              alt="Vista ampliada"
              width={600}
              height={600}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <FaIcon icon={faXmark} size={18} />
          </button>
        </div>
      )}
    </>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    // Supabase public URL format: .../storage/v1/object/public/{bucket}/{path}
    const marker = `/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  } catch {
    return null;
  }
}
