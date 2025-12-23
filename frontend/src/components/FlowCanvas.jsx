import React, { useMemo, useRef, useState, useEffect } from 'react';

const NODE_DEFS = [
  { id: 'upload', label: 'Upload' },
  { id: 'preprocess', label: 'Preprocess' },
  { id: 'split', label: 'Split' },
  { id: 'train', label: 'Train' },
  { id: 'results', label: 'Results' },
];

export default function FlowCanvas({
  activeStep = 0,
  onSelectStep,
  nodeState = {},
  previewData,
  preprocessInfo,
  splitInfo,
  results,
}) {
  const wrapRef = useRef(null);
  const [nodes, setNodes] = useState(() =>
    NODE_DEFS.map((n, idx) => ({
      ...n,
      x: 100 + idx * 180,
      y: 60,
      w: 140,
      h: 60,
    }))
  );
  const [drag, setDrag] = useState({ id: null, dx: 0, dy: 0 });
  const [popover, setPopover] = useState(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.id) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - drag.dx;
      const y = e.clientY - rect.top - drag.dy;
      setNodes((prev) =>
        prev.map((n) => (n.id === drag.id ? { ...n, x: Math.max(20, x), y: Math.max(20, y) } : n))
      );
    };
    const onUp = () => setDrag({ id: null, dx: 0, dy: 0 });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag]);

  const edges = useMemo(() => {
    const out = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const valid =
        (i === 0 && nodeState.upload) ||
        (i === 1 && nodeState.preprocess) ||
        (i === 2 && nodeState.split) ||
        (i === 3 && nodeState.train) ||
        false;
      out.push({ from: nodes[i], to: nodes[i + 1], valid });
    }
    return out;
  }, [nodes, nodeState.upload, nodeState.preprocess, nodeState.split, nodeState.train]);

  const bottomBoundary = useMemo(() => Math.max(...nodes.map((n) => n.y + n.h)) + 40, [nodes]);
  const minHeight = 180;
  const height = Math.max(minHeight, bottomBoundary);

  return (
    <div
      ref={wrapRef}
      style={{ height }}
      className="flow-canvas glass-panel gradient-border relative rounded-3xl p-4"
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {edges.map((e, idx) => {
          const x1 = e.from.x + e.from.w;
          const y1 = e.from.y + e.from.h / 2;
          const x2 = e.to.x;
          const y2 = e.to.y + e.to.h / 2;
          const mx = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          return (
            <path
              key={idx}
              d={path}
              className={`flow-connector ${e.valid ? 'valid' : 'invalid'}`}
              fill="none"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      {nodes.map((n, idx) => {
        const active = idx === activeStep;
        return (
          <div
            key={n.id}
            style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
            className={`flow-node ${active ? 'active' : ''}`}
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setDrag({ id: n.id, dx: e.clientX - rect.left, dy: e.clientY - rect.top });
            }}
            onClick={() => {
              setPopover(n.id === popover ? null : n.id);
              onSelectStep?.(idx);
            }}
          >
            <div className="text-sm font-semibold">{n.label}</div>
            <div className="text-[11px] text-white/60">Stage {idx + 1}</div>
            {popover === n.id && (
              <div className="popover">
                <div className="popover-title">{n.label}</div>
                <div className="popover-body">
                  {n.id === 'upload' && (
                    <div className="text-xs text-white/70">
                      {previewData
                        ? `${previewData.rows} rows • ${previewData.columns.length} columns`
                        : 'No dataset uploaded'}
                    </div>
                  )}
                  {n.id === 'preprocess' && (
                    <div className="text-xs text-white/70">
                      {preprocessInfo
                        ? `${preprocessInfo.samples} samples • ${preprocessInfo.dims} features`
                        : 'Not preprocessed'}
                    </div>
                  )}
                  {n.id === 'split' && (
                    <div className="text-xs text-white/70">
                      {splitInfo ? `${splitInfo.train} train • ${splitInfo.test} test` : 'Not split'}
                    </div>
                  )}
                  {n.id === 'train' && (
                    <div className="text-xs text-white/70">
                      {results ? `Accuracy ${results.accuracy}%` : 'Not trained'}
                    </div>
                  )}
                  {n.id === 'results' && (
                    <div className="text-xs text-white/70">
                      {results ? 'Results ready' : 'No results yet'}
                    </div>
                  )}
                </div>
                <div className="popover-actions">
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() => setPopover(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
