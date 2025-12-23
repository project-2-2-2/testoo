import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiCode, FiMenu, FiZap, FiUser } from 'react-icons/fi';

const navItems = [
  { to: '/', label: 'Home', icon: FiHome },
  { to: '/pipeline', label: 'Pipeline', icon: FiCode },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-pipeline-400 text-slate-900 shadow-aurora">
            <FiZap className="text-xl" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              OrangeFlow
            </p>
            <p className="text-xs uppercase tracking-widest text-white/70">
              ML Pipeline Builder
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg shadow-brand-900/20'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/pipeline"
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-pipeline-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-brand-900/40 transition hover:scale-[1.02]"
          >
            <FiCode />
            New Pipeline
          </Link>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:border-white/40 hover:text-white md:hidden"
            aria-label="Toggle navigation"
          >
            <FiMenu />
          </button>

          <button
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:border-white/40 hover:text-white md:flex"
            aria-label="Account"
          >
            <FiUser />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
