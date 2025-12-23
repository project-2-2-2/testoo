import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiDatabase,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiUpload,
  FiSliders,
  FiCpu,
  FiBarChart2,
  FiCheckCircle,
  FiCircle,
  FiArrowRight,
} from 'react-icons/fi';

const navLinks = [
  { to: '/', label: 'Home', icon: FiHome },
  { to: '/pipeline', label: 'New Pipeline', icon: FiDatabase },
];

const pipelineSteps = [
  { id: 1, title: 'Upload Data', icon: FiUpload, path: '/pipeline?step=upload' },
  { id: 2, title: 'Preprocess', icon: FiSliders, path: '/pipeline?step=preprocess' },
  { id: 3, title: 'Train Model', icon: FiCpu, path: '/pipeline?step=train' },
  { id: 4, title: 'View Results', icon: FiBarChart2, path: '/pipeline?step=results' },
];

const Sidebar = () => {
  const location = useLocation();
  const [showSteps, setShowSteps] = useState(true);

  const isActivePath = (path) => location.pathname === path;
  const getStatus = () => {
    try {
      return JSON.parse(localStorage.getItem('orangeflow_status') || '{}');
    } catch {
      return {};
    }
  };
  const st = getStatus();
  const completedCount = ['upload', 'preprocess', 'split', 'train'].reduce((acc, k) => acc + (st[k] ? 1 : 0), 0);
  const progress = Math.min((completedCount / 4) * 100, 100);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/5 bg-slate-950/90 px-5 py-6 shadow-2xl shadow-slate-950/60 backdrop-blur-2xl md:flex">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25rem] text-white/40">Navigation</p>
        <div className="mt-4 space-y-2">
          {navLinks.map((item) => {
            const active = isActivePath(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white/10 text-white shadow-inner shadow-brand-900/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="text-lg" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-slate-900/40">
        <button
          type="button"
          onClick={() => setShowSteps((prev) => !prev)}
          className="flex w-full items-center justify-between text-left text-sm font-semibold text-white"
        >
          <span>Pipeline Steps</span>
          {showSteps ? <FiChevronUp /> : <FiChevronDown />}
        </button>

        {showSteps && (
          <div className="mt-4 space-y-3">
            {pipelineSteps.map((step) => {
              const active =
                location.pathname === '/pipeline' && location.search.includes(step.path.split('?')[1]);
              const completed =
                (step.id === 1 && st.upload) ||
                (step.id === 2 && st.preprocess) ||
                (step.id === 3 && st.train) ||
                (step.id === 4 && st.results);
              return (
                <Link
                  key={step.id}
                  to={step.path}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'border-brand-400/50 bg-brand-500/10 text-white'
                      : 'border-white/5 text-white/60 hover:text-white hover:border-white/10'
                  }`}
                >
                  <span className="relative">
                    {completed ? (
                      <FiCheckCircle className="text-emerald-400" />
                    ) : (
                      <FiCircle className="text-white/30" />
                    )}
                  </span>
                  <div className="flex-1">
                    <p>{step.title}</p>
                    <p className="text-[10px] font-normal text-white/40">Stage {step.id}</p>
                  </div>
                  <FiArrowRight className="text-white/30" />
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.3rem] text-white/40">Progress</p>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-pipeline-400" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs font-semibold text-white/70">{Math.round(progress)}% Complete</p>
        </div>
      </div>

 
    </aside>
  );
};

export default Sidebar;
