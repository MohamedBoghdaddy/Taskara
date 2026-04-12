import React, { useRef, useState } from 'react';

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const fileIcon = (mimetype = '') => {
  if (mimetype.startsWith('image/')) return '🖼';
  if (mimetype === 'application/pdf') return '📄';
  if (mimetype.startsWith('audio/')) return '🎵';
  if (mimetype.startsWith('video/')) return '🎬';
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
  if (mimetype.includes('zip')) return '📦';
  return '📎';
};

/**
 * FileUpload component.
 * Props:
 *   onUpload(files: FileList|File[]) — called with selected files
 *   accept?: string — MIME types or extensions
 *   multiple?: boolean
 *   maxMB?: number
 *   uploading?: boolean
 *   label?: string
 */
export default function FileUpload({ onUpload, accept, multiple = true, maxMB = 25, uploading = false, label = 'Upload files' }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (!files?.length) return;
    const maxBytes = maxMB * 1024 * 1024;
    const valid = Array.from(files).filter(f => {
      if (f.size > maxBytes) { alert(`"${f.name}" exceeds ${maxMB}MB limit`); return false; }
      return true;
    });
    if (valid.length) onUpload(valid);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '20px',
        textAlign: 'center',
        cursor: uploading ? 'wait' : 'pointer',
        background: dragOver ? 'var(--primary)08' : 'var(--surface-alt)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>📎</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
        {uploading ? 'Uploading…' : label}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
        Drag & drop or click · Max {maxMB}MB
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}

/**
 * Displays a list of attachment objects: { _id, originalName, mimetype, size, url }
 */
export function AttachmentList({ attachments = [], onDelete, compact = false }) {
  const [preview, setPreview] = useState(null);

  if (!attachments.length) return null;

  return (
    <div>
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreview(null)}>
          <img src={preview} alt="preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {attachments.map(att => {
          const isImage = att.mimetype?.startsWith('image/');
          const isAudio = att.mimetype?.startsWith('audio/');
          return (
            <div key={att._id || att.filename} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: compact ? '4px 8px' : '8px 10px', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              {isImage
                ? <img src={att.url} alt={att.originalName} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', flexShrink: 0 }} onClick={() => setPreview(att.url)} />
                : <span style={{ fontSize: '20px', flexShrink: 0 }}>{fileIcon(att.mimetype)}</span>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.originalName || att.filename}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{att.size ? formatSize(att.size) : ''}</div>
                {isAudio && <audio src={att.url} controls style={{ height: '24px', marginTop: '4px', width: '100%' }} />}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <a href={att.url} target="_blank" rel="noreferrer" download={att.originalName} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary)18' }}>⬇</a>
                {onDelete && (
                  <button onClick={() => onDelete(att._id || att.filename)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '13px', padding: '2px 4px' }}>✕</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
