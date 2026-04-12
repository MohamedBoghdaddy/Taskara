import React, { useState, useEffect, useRef } from 'react';
import { getGraph } from '../api/index';
import { useNavigate } from 'react-router-dom';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  GraphIcon,
  NodeIcon,
  NetworkIcon,
  NoteIcon,
  TaskIcon,
  ProjectIcon,
  ArrowRight,
  InfoIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function GraphPage() {
  const canvasRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const animRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    getGraph()
      .then(data => { setGraphData(data); setLoading(false); })
      .catch(() => { toast.error('Failed to load graph'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (loading || !graphData.nodes.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.offsetWidth;
    const H = canvas.height = Math.max(500, canvas.parentElement.offsetHeight - 100);

    // Initialize positions
    const positions = {};
    graphData.nodes.forEach((n) => {
      positions[n.id] = positions[n.id] || {
        x: W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: H / 2 + (Math.random() - 0.5) * H * 0.6,
        vx: 0, vy: 0,
      };
    });

    const TYPE_COLORS = { note: '#6366F1', task: '#22C55E', project: '#F59E0B' };
    let frame = 0;

    const tick = () => {
      frame++;
      // Force-directed layout
      graphData.nodes.forEach(n => {
        const p = positions[n.id];
        // Repulsion from other nodes
        graphData.nodes.forEach(m => {
          if (m.id === n.id) return;
          const q = positions[m.id];
          const dx = p.x - q.x; const dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = 800 / (d * d);
          p.vx += dx / d * f; p.vy += dy / d * f;
        });
        // Center gravity
        p.vx += (W / 2 - p.x) * 0.002;
        p.vy += (H / 2 - p.y) * 0.002;
      });

      graphData.edges.forEach(e => {
        const a = positions[e.source?.toString()]; const b = positions[e.target?.toString()];
        if (!a || !b) return;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 80) * 0.05;
        const fx = dx / d * f; const fy = dy / d * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });

      graphData.nodes.forEach(n => {
        const p = positions[n.id];
        p.vx *= 0.85; p.vy *= 0.85;
        p.x = Math.max(20, Math.min(W - 20, p.x + p.vx));
        p.y = Math.max(20, Math.min(H - 20, p.y + p.vy));
      });

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Edges
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      graphData.edges.forEach(e => {
        const a = positions[e.source?.toString()]; const b = positions[e.target?.toString()];
        if (!a || !b) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });

      // Nodes
      graphData.nodes.forEach(n => {
        const p = positions[n.id];
        const isSelected = selected && selected.id === n.id;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = TYPE_COLORS[n.type] || '#94A3B8';
        ctx.fill();
        if (isSelected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }

        ctx.fillStyle = '#F9FAFB';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const label = (n.label || '').substring(0, 20);
        ctx.fillText(label, p.x, p.y + 18);
      });

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    // Click detection
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      for (const n of graphData.nodes) {
        const p = positions[n.id?.toString()];
        if (!p) continue;
        const dx = mx - p.x; const dy = my - p.y;
        if (dx * dx + dy * dy < 100) {
          setSelected(n);
          return;
        }
      }
      setSelected(null);
    };
    canvas.addEventListener('click', handleClick);

    return () => { cancelAnimationFrame(animRef.current); canvas.removeEventListener('click', handleClick); };
  }, [graphData, loading, selected]);

  return (
    <div style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <FeatureGuide
        storageKey="graph-guide"
        title="Knowledge Graph"
        icon={<GraphIcon />}
        description="The Knowledge Graph visualises relationships between your notes, tasks, and projects using a live force-directed simulation."
        steps={[
          {
            icon: <NetworkIcon />,
            title: 'Force-directed layout',
            body: 'Nodes repel each other but linked nodes are pulled together, clustering related items automatically.',
          },
          {
            icon: <NodeIcon />,
            title: 'Click a node',
            body: 'Click any dot to select it and see its label and type in the info panel at the bottom-left.',
          },
          {
            icon: <ArrowRight />,
            title: 'Open the item',
            body: 'With a node selected, press "Open" in the panel to navigate directly to that note or project.',
          },
          {
            icon: <InfoIcon />,
            title: 'Colour legend',
            body: 'Purple = note, green = task, yellow = project. Grey nodes have an unknown type.',
          },
        ]}
        tips={[
          'Link notes to each other in the note editor to build connections',
          'More links = tighter clusters — great for finding related content',
          'The graph settles after a few seconds; click the canvas to deselect a node',
        ]}
        accentColor="#6366F1"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraphIcon /> Knowledge Graph
        </h1>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {[
            { type: 'note', color: '#6366F1', icon: <NoteIcon /> },
            { type: 'task', color: '#22C55E', icon: <TaskIcon /> },
            { type: 'project', color: '#F59E0B', icon: <ProjectIcon /> },
          ].map(({ type, color, icon }) => (
            <Tooltip key={type} content={`${type.charAt(0).toUpperCase() + type.slice(1)} nodes`} placement="bottom">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                {icon} {type}
              </span>
            </Tooltip>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading graph...
        </div>
      ) : graphData.nodes.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '40px', color: 'var(--text-muted)' }}><NetworkIcon /></span>
          <p>No links yet. Link notes to each other to build your knowledge graph.</p>
        </div>
      ) : (
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative', overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          {selected && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{selected.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'capitalize' }}>
                {selected.type}
              </div>
              <Tooltip content={`Open this ${selected.type}`} placement="top">
                <button
                  onClick={() => {
                    if (selected.type === 'note') navigate(`/notes/${selected.id}`);
                    else if (selected.type === 'project') navigate(`/projects/${selected.id}`);
                  }}
                  style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Open <ArrowRight size="xs" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
