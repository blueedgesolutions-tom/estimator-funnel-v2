'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Copy, Check } from 'lucide-react';

interface BlobAsset {
  url: string;
  pathname: string;
  uploadedAt: string;
  size: number;
}

interface Props {
  tenantId: string;
  onUseUrl?: (url: string) => void;
}

const MAX_PX = 2400;
const WEBP_QUALITY = 0.85;

async function standardizeImage(file: File): Promise<Blob> {
  let source: Blob = file;

  // Convert HEIC/HEIF to JPEG first so the canvas can read it
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    source = Array.isArray(result) ? result[0] : result;
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(source);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (w > MAX_PX || h > MAX_PX) {
    const scale = MAX_PX / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas WebP conversion failed'))),
      'image/webp',
      WEBP_QUALITY,
    ),
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetUploader({ tenantId, onUseUrl }: Props) {
  const [assets, setAssets] = useState<BlobAsset[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchAssets() {
    try {
      const res = await fetch(`/api/list-assets?tenantId=${encodeURIComponent(tenantId)}`);
      if (res.ok) setAssets(await res.json());
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { fetchAssets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const webpBlob = await standardizeImage(file);
      const baseName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .toLowerCase();
      const webpFile = new File([webpBlob], `${baseName}.webp`, { type: 'image/webp' });

      const form = new FormData();
      form.append('file', webpFile);
      form.append('tenantId', tenantId);

      const res = await fetch('/api/upload-asset', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Upload failed (${res.status})`);
      }

      await fetchAssets();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch { /* ignore */ }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Drop zone */}
      <div
        className={`asset-dropzone${dragging ? ' asset-dropzone--active' : ''}${uploading ? ' asset-dropzone--uploading' : ''}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="asset-dropzone-inner">
            <div className="asset-spinner" />
            <span>Processing &amp; uploading…</span>
          </div>
        ) : (
          <div className="asset-dropzone-inner">
            <Upload size={18} />
            <span>Drop an image here, or <strong>click to browse</strong></span>
            <span className="asset-dropzone-hint">Converted to WebP · max 2400 px · HEIC supported</span>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="asset-error">{uploadError}</div>
      )}

      {/* Asset list */}
      <div className="asset-list">
        {loadingList ? (
          <div className="asset-list-empty">Loading…</div>
        ) : assets.length === 0 ? (
          <div className="asset-list-empty">No assets uploaded yet.</div>
        ) : (
          assets.map((asset) => {
            const filename = asset.pathname.split('/').pop() ?? asset.pathname;
            const isCopied = copiedUrl === asset.url;
            return (
              <div key={asset.url} className="asset-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="asset-thumb" src={asset.url} alt="" loading="lazy" />
                <div className="asset-info">
                  <div className="asset-filename" title={filename}>{filename}</div>
                  <div className="asset-url" title={asset.url}>{asset.url}</div>
                  <div className="asset-meta">
                    {formatSize(asset.size)} · {new Date(asset.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="asset-actions">
                  <button className="asset-btn" onClick={() => copyUrl(asset.url)} title="Copy URL">
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    {isCopied ? 'Copied!' : 'Copy URL'}
                  </button>
                  {onUseUrl && (
                    <button
                      className="asset-btn asset-btn--primary"
                      onClick={() => onUseUrl(asset.url)}
                      title="Use as Logo URL"
                    >
                      Use as logo
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
