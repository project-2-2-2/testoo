import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiUpload,
  FiSliders,
  FiCpu,
  FiBarChart2,
  FiDatabase,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiAward,
  FiPlay,
  FiArrowRight,
} from 'react-icons/fi';

const stats = [
  { label: 'Datasets Processed', value: '25', change: '+12%', icon: FiDatabase },
  { label: 'Models Trained', value: '15', change: '+8%', icon: FiCpu },
  { label: 'Active Users', value: '2', change: '+15%', icon: FiUsers },
  { label: 'Accuracy Rate', value: '90% (on average)', change: '+3%', icon: FiAward },
];

const features = [
  {
    icon: FiUpload,
    title: 'Upload Dataset',
    description: 'Import CSV/Excel files with automatic schema detection and smart preview.',
  },
  {
    icon: FiSliders,
    title: 'Preprocess Visually',
    description: 'Handle scaling, encoding and missing data with guided controls.',
  },
  {
    icon: FiCpu,
    title: 'Train Multiple Models',
    description: 'Launch experiments with logistic regression, trees and more.',
  },
  {
    icon: FiBarChart2,
    title: 'Inspect Results',
    description: 'Interactive charts, confusion matrices and classification reports.',
  },
];

const pipelineSteps = [
  { icon: FiDatabase, title: 'Data Input', description: 'Upload your raw dataset' },
  { icon: FiTarget, title: 'Preprocess', description: 'Impute, scale, encode features' },
  { icon: FiCpu, title: 'Train', description: 'Pick models and tune hyperparameters' },
  { icon: FiBarChart2, title: 'Evaluate', description: 'Visualize metrics & insights' },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-28 pb-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/20 to-transparent blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.35rem] text-white/60">
            Inspired by Orange Data Mining
          </div>
          <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            Build end-to-end ML pipelines
            <span className="block bg-gradient-to-r from-brand-300 to-pipeline-300 bg-clip-text text-transparent">
              without writing code
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-white/70">
            Drag blocks, upload datasets, configure preprocessing, train models and inspect performance —
            all inside a tactile interface inspired by the playful yet powerful Orange Data Mining experience.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/pipeline"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-pipeline-400 px-8 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-brand-900/40 transition hover:scale-[1.03]"
            >
              <FiPlay />
              Launch Builder
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-3 text-base font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Explore Features
              <FiArrowRight />
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 pb-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-slate-900/40"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3rem] text-white/40">
                {stat.label}
                <stat.icon className="text-white/50" />
              </div>
              <p className="mt-4 font-display text-3xl text-white">{stat.value}</p>
              <p className="text-sm font-semibold text-emerald-400">{stat.change}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl rounded-4xl border border-white/5 bg-slate-900/60 p-10 shadow-aurora">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35rem] text-pipeline-200">Flow</p>
            <h2 className="mt-4 text-3xl font-semibold">Visual pipeline navigation</h2>
            <p className="mt-3 text-white/60">
              Follow the same steps Orange pioneered: connect data, clean, model, and analyze in a
              glowing flow line that responds to your progress.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {pipelineSteps.map((step, idx) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="glass-panel gradient-border flex h-20 w-20 items-center justify-center rounded-3xl">
                  <step.icon className="text-2xl text-brand-300" />
                </div>
                <p className="mt-4 font-semibold">{step.title}</p>
                <p className="text-sm text-white/60">{step.description}</p>
                {idx < pipelineSteps.length - 1 && (
                  <div className="mt-6 hidden w-full items-center justify-center md:flex">
                    <span className="h-px w-16 bg-gradient-to-r from-brand-500/30 to-white/5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35rem] text-brand-300">Capabilities</p>
            <h2 className="mt-4 text-3xl font-semibold">Everything you need in one workspace</h2>
            <p className="mt-3 text-white/60">
              OrangeFlow blends analytics, automation and visual experimentation to accelerate ML delivery.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-panel gradient-border relative overflow-hidden rounded-4xl p-6 transition hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/10 p-3 text-brand-300">
                    <feature.icon className="text-xl" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{feature.title}</p>
                    <p className="text-sm text-white/60">{feature.description}</p>
                  </div>
                </div>
                <Link
                  to="/pipeline"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-300"
                >
                  Open in builder <FiArrowRight />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center rounded-4xl border border-white/10 bg-gradient-to-r from-brand-400/20 to-pipeline-400/20 p-10 text-center shadow-aurora">
          <h2 className="text-3xl font-semibold text-white">Ready to sculpt your first OrangeFlow?</h2>
          <p className="mt-4 text-white/70">
            Launch the pipeline canvas, upload sample data, and feel the tactile satisfaction of building ML visually.
          </p>
          <Link
            to="/pipeline"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-white/40 transition hover:scale-[1.02]"
          >
            <FiPlay />
            Start building now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
