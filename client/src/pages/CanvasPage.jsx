import React, { useRef, useState, useEffect, useCallback } from 'react';
import FeatureGuide from '../components/common/FeatureGuide';
import {
  PaletteIcon, UndoIcon, RedoIcon, DeleteIcon, DownloadIcon,
  EditIcon, AlignCenterIcon, BlueprintIcon,
} from '../components/common/Icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen, faEraser, faFont, faSquare, faCircle,
  faArrowRight, faMousePointer,
} from '@fortawesome/free-solid-svg-icons';

const TOOLS  = { PEN: 'pen', ERASER: 'eraser', TEXT: 'text', RECT: 'rect', CIRCLE: 'circle', ARROW: 'arrow', SELECT: 'select' };
const COLORS = ['#6366f1','#ef4444','#f97316','#10b981','#3b82f6','#8b5cf6','#f59e0b','#1f2937','#ffffff'];
const SIZES  = [2, 4, 8, 16];

const TOOL_DEFS = [
  { key: TOOLS.SELECT, icon: faMousePointer, title: 'Select' },
  { key: TOOLS.PEN,    icon: faPen,          title: 'Pen' },
  { key: TOOLS.ERASER, icon: faEraser,       title: 'Eraser' },
  { key: TOOLS.RECT,   icon: faSquare,       title: 'Rectangle' },
  { key: TOOLS.CIRCLE, icon: faCircle,       title: 'Circle / Ellipse' },
  { key: TOOLS.ARROW,  icon: faArrowRight,   title: 'Arrow' },
  { key: TOOLS.TEXT,   icon: faFont,         title: 'Text' },
];

export default function CanvasPage() {
  const canvasRef  = useRef(null);
  const [tool,      setTool]      = useState(TOOLS.PEN);
  const [color,     setColor]     = useState('#6366f1');
  const [size,      setSize]      = useState(3);
  const [drawing,   setDrawing]   = useState(false);
  const [paths,     setPaths]     = useState([]);
  const [cur,       setCur]       = useState(null);
  const [history,   setHistory]   = useState([]);
  const [texts,     setTexts]     = useState([]);
  const [textInput, setTextInput] = useState(null);
  const [textVal,   setTextVal]   = useState('');
  const [guideOpen, setGuideOpen] = useState(true);
  const lastPos = useRef(null);

  const getPos = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const src = e.touches?.[0] || e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dot grid background
    ctx.fillStyle = 'rgba(100,100,100,0.08)';
    for (let x = 0; x < canvas.width; x += 40) {
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const p of paths) {
      if (p.type === 'pen' || p.type === 'eraser') {
        if (!p.points?.length) continue;
        ctx.beginPath();
        ctx.strokeStyle = p.type === 'eraser'
          ? (getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#fff')
          : p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = p.type === 'eraser' ? 'destination-out' : 'source-over';
        p.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.type === 'rect') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1);
      } else if (p.type === 'circle') {
        const rx = Math.abs(p.x2 - p.x1) / 2, ry = Math.abs(p.y2 - p.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(p.x1 + (p.x2 - p.x1) / 2, p.y1 + (p.y2 - p.y1) / 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.stroke();
      } else if (p.type === 'arrow') {
        drawArrow(ctx, p.x1, p.y1, p.x2, p.y2, p.color, p.size);
      }
    }

    if (cur) {
      if (cur.type === 'rect') {
        ctx.strokeStyle = cur.color; ctx.lineWidth = cur.size;
        ctx.strokeRect(cur.x1, cur.y1, cur.x2 - cur.x1, cur.y2 - cur.y1);
      } else if (cur.type === 'circle') {
        const rx = Math.abs(cur.x2 - cur.x1) / 2, ry = Math.abs(cur.y2 - cur.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cur.x1 + (cur.x2 - cur.x1) / 2, cur.y1 + (cur.y2 - cur.y1) / 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = cur.color; ctx.lineWidth = cur.size; ctx.stroke();
      } else if (cur.type === 'arrow') {
        drawArrow(ctx, cur.x1, cur.y1, cur.x2, cur.y2, cur.color, cur.size);
      }
    }

    for (const t of texts) {
      ctx.font = `${t.size * 6}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
  }, [paths, cur, texts]);

  useEffect(() => { redraw(); }, [redraw]);

  const drawArrow = (ctx, x1, y1, x2, y2, clr, lw) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len   = 12 + lw * 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = clr; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fillStyle = clr; ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; redraw(); };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onDown = (e) => {
    if (tool === TOOLS.TEXT) { setTextInput(getPos(e)); setTextVal(''); return; }
    const pos = getPos(e);
    setDrawing(true);
    lastPos.current = pos;
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      setCur({ type: tool, color, size, points: [pos] });
    } else {
      setCur({ type: tool, color, size, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    }
  };

  const onMove = (e) => {
    if (!drawing || !cur) return;
    const pos = getPos(e);
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      setCur(p => ({ ...p, points: [...p.points, pos] }));
    } else {
      setCur(p => ({ ...p, x2: pos.x, y2: pos.y }));
    }
    lastPos.current = pos;
  };

  const onUp = () => {
    if (!drawing || !cur) return;
    setDrawing(false);
    setPaths(p => [...p, cur]);
    setHistory([]);
    setCur(null);
  };

  const undo = () => {
    if (!paths.length) return;
    setHistory(h => [...h, paths[paths.length - 1]]);
    setPaths(p => p.slice(0, -1));
  };

  const redo = () => {
    if (!history.length) return;
    setPaths(p => [...p, history[history.length - 1]]);
    setHistory(h => h.slice(0, -1));
  };

  const clear     = () => { if (window.confirm('Clear canvas?')) { setPaths([]); setTexts([]); setHistory([]); } };
  const saveImage = () => {
    const a = document.createElement('a');
    a.download = 'canvas.png';
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };
  const addText   = () => {
    if (textVal.trim() && textInput) {
      setTexts(t => [...t, { text: textVal, x: textInput.x, y: textInput.y, color, size }]);
    }
    setTextInput(null); setTextVal('');
  };

  const cursorStyle = tool === TOOLS.ERASER ? 'cell' : tool === TOOLS.TEXT ? 'text' : tool === TOOLS.SELECT ? 'default' : 'crosshair';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Inline guide banner (compact) */}
      {guideOpen && (
        <div style={{ padding: '8px 16px', background: 'var(--primary)10', borderBottom: '1px solid var(--primary)22', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <BlueprintIcon size="xs" color="var(--primary)" />
          <strong>Canvas:</strong> Freehand drawing, shapes, arrows, and text. Use
          <kbd style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', padding: '0 4px', fontSize: '11px' }}>Ctrl+Z</kbd> to undo,
          <kbd style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', padding: '0 4px', fontSize: '11px' }}>Ctrl+Y</kbd> to redo.
          Click a color swatch to change stroke color. Click <strong>Save PNG</strong> to export.
          <button onClick={() => setGuideOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px' }}>Dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: '700', fontSize: '14px', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <PaletteIcon size="sm" color="var(--primary)" /> Canvas
        </span>

        {/* Tool buttons */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {TOOL_DEFS.map(({ key, icon, title }) => (
            <button
              key={key}
              title={title}
              onClick={() => setTool(key)}
              style={{
                padding: '7px 10px', border: 'none', borderRadius: 'var(--radius)',
                background: tool === key ? 'var(--primary)' : 'var(--surface-alt)',
                color: tool === key ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center',
              }}
            >
              <FontAwesomeIcon icon={icon} />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              style={{
                width: 20, height: 20, borderRadius: '50%', background: c,
                border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Sizes */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                padding: '4px 8px', border: 'none', borderRadius: 'var(--radius)',
                background: size === s ? 'var(--primary)' : 'var(--surface-alt)',
                color: size === s ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '11px',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button onClick={undo} title="Undo (Ctrl+Z)" style={btnStyle}>
            <UndoIcon size="xs" /> Undo
          </button>
          <button onClick={redo} title="Redo (Ctrl+Y)" style={btnStyle}>
            <RedoIcon size="xs" /> Redo
          </button>
          <button onClick={clear} style={{ ...btnStyle, color: 'var(--error)' }}>
            <DeleteIcon size="xs" /> Clear
          </button>
          <button onClick={saveImage} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}>
            <DownloadIcon size="xs" /> Save PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--surface)' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', cursor: cursorStyle, touchAction: 'none' }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={e => { e.preventDefault(); onDown(e); }}
          onTouchMove={e => { e.preventDefault(); onMove(e); }}
          onTouchEnd={onUp}
        />

        {/* Text input overlay */}
        {textInput && (
          <div style={{ position: 'absolute', left: textInput.x, top: textInput.y - 16 }}>
            <input
              autoFocus
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addText(); if (e.key === 'Escape') setTextInput(null); }}
              onBlur={addText}
              style={{
                background: 'rgba(255,255,255,0.92)', border: '1px dashed var(--primary)',
                borderRadius: '3px', padding: '2px 6px', fontSize: '16px',
                color: color, outline: 'none', minWidth: '80px',
              }}
              placeholder="Type text…"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '5px 10px', border: 'none', borderRadius: 'var(--radius)',
  background: 'var(--surface-alt)', color: 'var(--text-secondary)',
  cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
};
