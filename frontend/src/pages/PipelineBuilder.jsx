import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import FlowCanvas from '../components/FlowCanvas';
const STATUS_KEY = 'orangeflow_status';
import {
  FiDatabase,
  FiSliders,
  FiTarget,
  FiCpu,
  FiBarChart2,
  FiUpload,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
} from 'react-icons/fi';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const STEP_DEFS = [
  { title: 'Upload', description: 'Drop CSV/Excel data', icon: FiDatabase },
  { title: 'Preprocess', description: 'Choose target/features', icon: FiSliders },
  { title: 'Split', description: 'Train/Test settings', icon: FiTarget },
  { title: 'Train', description: 'Select & tune model', icon: FiCpu },
  { title: 'Results', description: 'Visualize metrics', icon: FiBarChart2 },
];
const STEP_KEYS = ['upload', 'preprocess', 'split', 'train', 'results'];

const PipelineBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [preprocessConfig, setPreprocessConfig] = useState({
    target: '',
    features: [],
    scaling: 'standard',
    handle_missing: 'drop',
  });
  const [splitConfig, setSplitConfig] = useState({ test_size: 0.2, random_state: 42, stratify: true });
  const [modelConfig, setModelConfig] = useState({ model_type: 'logistic', params: { C: 1 } });
  const [preprocessInfo, setPreprocessInfo] = useState(null);
  const [splitInfo, setSplitInfo] = useState(null);
  const [results, setResults] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState({ preprocess: false, split: false, train: false });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (status, message) => setToast({ status, message });
  const readStatus = () => {
    try {
      return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    } catch {
      return {};
    }
  };
  const writeStatus = (partial) => {
    const s = readStatus();
    localStorage.setItem(STATUS_KEY, JSON.stringify({ ...s, ...partial }));
  };

  const progress = useMemo(() => {
    let completed = 0;
    if (selectedFile) completed += 1;
    if (preprocessInfo) completed += 1;
    if (splitInfo) completed += 1;
    if (results) completed += 1;
    return Math.min((completed / 4) * 100, 100);
  }, [selectedFile, preprocessInfo, splitInfo, results]);

  useEffect(() => {
    const stepKey = searchParams.get('step');
    if (stepKey) {
      const idx = STEP_KEYS.indexOf(stepKey);
      if (idx >= 0) setActiveStep(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStep = (idx) => {
    setActiveStep(idx);
    setSearchParams({ step: STEP_KEYS[idx] });
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    goToStep(1);

    const formData = new FormData();
    formData.append('file', file);

  try {
    const { data } = await axios.post(`${API_BASE_URL}/upload`, formData);
    setPreviewData(data);
    setPreprocessConfig((prev) => ({
      ...prev,
      target: data.suggested_target || data.columns[0] || '',
      features: (data.numeric_columns?.length ? data.numeric_columns : data.columns).filter(
        (c) => c !== (data.suggested_target || data.columns[0])
      ),
    }));
      setPreprocessInfo(null);
      setSplitInfo(null);
      setResults(null);
      localStorage.setItem(STATUS_KEY, JSON.stringify({ upload: true, preprocess: false, split: false, train: false, results: false }));
      showToast('success', `Dataset uploaded (${data.rows} rows, ${data.columns.length} columns)`);
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Upload failed. Check file format.');
    }
  };

  const runPreprocess = async () => {
    if (!previewData) {
      showToast('warning', 'Upload a dataset first.');
      return;
    }
    if (!preprocessConfig.target || !preprocessConfig.features.length) {
      showToast('warning', 'Select target and at least one feature.');
      return;
    }
    setLoading((prev) => ({ ...prev, preprocess: true }));
    try {
      const { data } = await axios.post(`${API_BASE_URL}/preprocess`, preprocessConfig);
      setPreprocessInfo(data);
      setSplitInfo(null);
      setResults(null);
      writeStatus({ preprocess: true });
      goToStep(2);
      showToast('success', 'Preprocessing complete.');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Preprocess failed.');
    } finally {
      setLoading((prev) => ({ ...prev, preprocess: false }));
    }
  };

  const runSplit = async () => {
    if (!preprocessInfo) {
      showToast('warning', 'Run preprocessing first.');
      return;
    }
    setLoading((prev) => ({ ...prev, split: true }));
    try {
      const { data } = await axios.post(`${API_BASE_URL}/split`, splitConfig);
      setSplitInfo(data);
      setResults(null);
      writeStatus({ split: true });
      goToStep(3);
      showToast('success', 'Dataset split into train/test sets.');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Split failed.');
    } finally {
      setLoading((prev) => ({ ...prev, split: false }));
    }
  };

  const runTrain = async () => {
    if (!splitInfo) {
      showToast('warning', 'Complete the split step first.');
      return;
    }
    setLoading((prev) => ({ ...prev, train: true }));
    try {
      const { data } = await axios.post(`${API_BASE_URL}/train`, modelConfig);
      setResults(data);
      writeStatus({ train: true, results: true });
      goToStep(4);
      showToast('success', `Training complete (${data.accuracy}%)`);
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Training failed.');
    } finally {
      setLoading((prev) => ({ ...prev, train: false }));
    }
  };

  const stepStatus = (idx) => {
    if (idx === 0) return selectedFile ? 'complete' : 'pending';
    if (idx === 1) return preprocessInfo ? 'complete' : idx === activeStep ? 'active' : 'pending';
    if (idx === 2) return splitInfo ? 'complete' : idx === activeStep ? 'active' : 'pending';
    if (idx === 3) return results ? 'complete' : idx === activeStep ? 'active' : 'pending';
    return results ? 'complete' : 'pending';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {toast && (
        <div
          className={`fixed right-6 top-24 z-40 rounded-2xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/40 ${
            toast.status === 'success'
              ? 'bg-emerald-400 text-white'
              : toast.status === 'error'
              ? 'bg-red-400 text-white'
              : 'bg-yellow-400 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-24 md:ml-64">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35rem] text-brand-300">Pipeline Builder</p>
              <h1 className="font-display text-4xl text-white">OrangeFlow Studio</h1>
              <p className="mt-2 text-white/60">
                Follow Oranges iconic flow: upload data, sculpt preprocessing, split intuitively, train visually, and inspect rich analytics.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="text-xs uppercase tracking-[0.3rem] text-white/50">Progress</div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-pipeline-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="mb-8">
          <FlowCanvas activeStep={activeStep} onSelectStep={(idx) => goToStep(idx)} />
          <FlowCanvas
            activeStep={activeStep}
            onSelectStep={(idx) => goToStep(idx)}
            nodeState={{
              upload: !!selectedFile,
              preprocess: !!preprocessInfo,
              split: !!splitInfo,
              train: !!results,
            }}
            previewData={previewData}
            preprocessInfo={preprocessInfo}
            splitInfo={splitInfo}
            results={results}
          />
        </div>

        <nav className="mb-10 rounded-4xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-slate-900/40">
          <div className="grid gap-4 md:grid-cols-5">
            {STEP_DEFS.map((step, idx) => {
              const status = stepStatus(idx);
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={`rounded-3xl border px-4 py-4 text-left transition ${
                    status === 'complete'
                      ? 'bg-emerald-400 text-white'
                      : status === 'active'
                      ? 'bg-brand-400 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <step.icon className="text-xl text-brand-200" />
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-white/50">{step.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="rounded-4xl border border-white/10 bg-slate-900/60 p-6 shadow-aurora">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35rem] text-brand-200">Current Step</p>
              <h2 className="text-2xl font-semibold">{STEP_DEFS[activeStep].title}</h2>
            </div>
            <p className="text-sm text-white/60">Step {activeStep + 1} / {STEP_DEFS.length}</p>
          </div>

          <div className="mt-6 space-y-6">
            {activeStep === 0 && (
              <UploadStep selectedFile={selectedFile} previewData={previewData} onUpload={handleUpload} />
            )}
            {activeStep === 1 && (
              <PreprocessStep
                config={preprocessConfig}
                previewData={previewData}
                onChange={setPreprocessConfig}
                onSubmit={runPreprocess}
                loading={loading.preprocess}
                info={preprocessInfo}
              />
            )}
            {activeStep === 2 && (
              <SplitStep
                config={splitConfig}
                onChange={setSplitConfig}
                onSubmit={runSplit}
                loading={loading.split}
                info={splitInfo}
              />
            )}
            {activeStep === 3 && (
              <TrainStep
                config={modelConfig}
                onChange={setModelConfig}
                onSubmit={runTrain}
                loading={loading.train}
              />
            )}
            {activeStep === 4 && <ResultsStep results={results} onRestart={() => { localStorage.removeItem(STATUS_KEY); goToStep(0); }} />}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
            <button
              type="button"
              onClick={() => goToStep(Math.max(activeStep - 1, 0))}
              disabled={activeStep === 0}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/40 disabled:opacity-40"
            >
              <FiChevronLeft /> Previous
            </button>
            {activeStep < 4 && (
              <button
                type="button"
                onClick={() => goToStep(Math.min(activeStep + 1, STEP_DEFS.length - 1))}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Next <FiChevronRight />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const UploadStep = ({ selectedFile, previewData, onUpload }) => (
  <div className="space-y-6">
    <label
      htmlFor="dataset-input"
      className="glass-panel gradient-border flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition hover:-translate-y-1"
    >
      <input id="dataset-input" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={onUpload} />
      {selectedFile ? (
        <>
          <FiCheckCircle className="text-4xl text-emerald-400" />
          <p className="mt-4 text-lg font-semibold">{selectedFile.name}</p>
          <p className="text-sm text-white/60">Click to change file</p>
        </>
      ) : (
        <>
          <FiUpload className="text-4xl text-brand-300" />
          <p className="mt-4 text-lg font-semibold">Drop your dataset</p>
          <p className="text-sm text-white/60">CSV or Excel  Drag & drop or browse</p>
        </>
      )}
    </label>

    {previewData && (
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/60">Dataset Preview</p>
            <p className="text-lg font-semibold text-white">
              {previewData.rows} rows  {previewData.columns.length} columns
            </p>
          </div>
        </div>
        <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-white/5">
          <table className="w-full text-sm text-white/80">
            <thead className="sticky top-0 bg-slate-900/90 text-xs uppercase tracking-widest text-white/60">
              <tr>
                {previewData.columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.preview.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5">
                  {previewData.columns.map((col) => (
                    <td key={col} className="px-4 py-3">
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

const PreprocessStep = ({ config, previewData, onChange, onSubmit, loading, info }) => {
  const toggleFeature = (field) => {
    const exists = config.features.includes(field);
    onChange({
      ...config,
      features: exists ? config.features.filter((f) => f !== field) : [...config.features, field],
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel gradient-border rounded-3xl p-5">
          <p className="text-sm text-white/60">Target Column</p>
          <select
            value={config.target}
            onChange={(e) => onChange({ ...config, target: e.target.value })}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          >
            <option value="">Select target column</option>
            {previewData?.columns?.map((col) => (
              <option key={col} value={col} className="bg-slate-900 text-white">
                {col}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-panel gradient-border rounded-3xl p-5 space-y-4">
          <div>
            <p className="text-sm text-white/60">Scaling</p>
            <select
              value={config.scaling}
              onChange={(e) => onChange({ ...config, scaling: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            >
              <option value="standard">StandardScaler</option>
              <option value="minmax">MinMaxScaler</option>
              <option value="none">No scaling</option>
            </select>
          </div>
          <div>
            <p className="text-sm text-white/60">Missing values</p>
            <select
              value={config.handle_missing}
              onChange={(e) => onChange({ ...config, handle_missing: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            >
              <option value="drop">Drop rows</option>
              <option value="mean">Fill with mean/mode</option>
              <option value="median">Fill with median/mode</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel gradient-border rounded-3xl p-5">
        <p className="text-sm text-white/60">Select features</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {previewData?.columns?.map((col) => (
            <label
              key={col}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition"
            >
              <input
                type="checkbox"
                checked={config.features.includes(col)}
                disabled={col === config.target}
                onChange={() => toggleFeature(col)}
                className="rounded border-white/20 bg-transparent"
              />
              {col}
            </label>
          ))}
        </div>
      </div>

      <ActionBar
        label="Apply preprocessing"
        onSubmit={onSubmit}
        loading={loading}
        info={info ? `${info.samples} samples • ${info.dims} features` : undefined}
      />
    </div>
  );
};

const SplitStep = ({ config, onChange, onSubmit, loading, info }) => (
  <div className="space-y-6">
    <div className="glass-panel gradient-border rounded-3xl p-5 grid gap-6 md:grid-cols-2">
      <div>
        <p className="text-sm text-white/60">Test size</p>
        <input
          type="number"
          min="0.1"
          max="0.5"
          step="0.05"
          value={config.test_size}
          onChange={(e) => onChange({ ...config, test_size: parseFloat(e.target.value) || 0.2 })}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: '70-30', ts: 0.3 },
            { label: '75-25', ts: 0.25 },
            { label: '80-20', ts: 0.2 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange({ ...config, test_size: opt.ts })}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                Math.abs(config.test_size - opt.ts) < 1e-6
                  ? 'bg-brand-400 text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/60">
          Train {(100 - Math.round(config.test_size * 100))}% / Test {Math.round(config.test_size * 100)}%
        </p>
      </div>
      <div>
        <p className="text-sm text-white/60">Random state</p>
        <input
          type="number"
          min="0"
          max="999"
          value={config.random_state}
          onChange={(e) => onChange({ ...config, random_state: parseInt(e.target.value || '42', 10) })}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
        />
      </div>
    </div>
    <label className="flex items-center gap-2 text-sm text-white/70">
      <input
        type="checkbox"
        checked={config.stratify}
        onChange={(e) => onChange({ ...config, stratify: e.target.checked })}
        className="rounded border-white/30 bg-transparent"
      />
      Stratify classes during split
    </label>

    <ActionBar
      label="Run split"
      onSubmit={onSubmit}
      loading={loading}
      info={info ? `${info.train} train • ${info.test} test` : undefined}
    />
  </div>
);

const TrainStep = ({ config, onChange, onSubmit, loading }) => (
  <div className="space-y-6">
    <div className="glass-panel gradient-border rounded-3xl p-5">
      <p className="text-sm text-white/60">Algorithm</p>
      <select
        value={config.model_type}
        onChange={(e) => onChange({
          model_type: e.target.value,
          params: e.target.value === 'tree' ? { max_depth: 5 } : { C: 1 },
        })}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
      >
        <option value="logistic">Logistic Regression</option>
        <option value="tree">Decision Tree</option>
      </select>
    </div>

    <div className="glass-panel rounded-3xl p-5">
      {config.model_type === 'logistic' ? (
        <div>
          <p className="text-sm text-white/60">Regularization (C)</p>
          <input
            type="number"
            min="0.01"
            max="10"
            step="0.1"
            value={config.params.C}
            onChange={(e) => onChange({ ...config, params: { C: parseFloat(e.target.value) || 1 } })}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
      ) : (
        <div>
          <p className="text-sm text-white/60">Max depth</p>
          <input
            type="number"
            min="1"
            max="30"
            step="1"
            value={config.params.max_depth}
            onChange={(e) => onChange({ ...config, params: { max_depth: parseInt(e.target.value || '5', 10) } })}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
      )}
    </div>

    <ActionBar label="Train model" onSubmit={onSubmit} loading={loading} />
  </div>
);

const ResultsStep = ({ results, onRestart }) => {
  const [drag, setDrag] = useState({ dx: 0, dy: 0, active: false });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const onMove = (e) => {
      if (!drag.active) return;
      setPos((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    };
    const onUp = () => setDrag({ dx: 0, dy: 0, active: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag.active]);

  const computed = useMemo(() => {
    const cm = results?.confusion_matrix;
    if (Array.isArray(cm) && cm.length === 2 && Array.isArray(cm[0]) && Array.isArray(cm[1]) && cm[0].length === 2 && cm[1].length === 2) {
      const tn = cm[0][0] || 0;
      const fp = cm[0][1] || 0;
      const fn = cm[1][0] || 0;
      const tp = cm[1][1] || 0;
      const total = tn + fp + fn + tp;
      const acc = total ? ((tp + tn) / total) * 100 : 0;
      const precision = tp + fp ? (tp / (tp + fp)) * 100 : 0;
      const recall = tp + fn ? (tp / (tp + fn)) * 100 : 0;
      const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
      return { tn, fp, fn, tp, acc, precision, recall, f1 };
    }
    const perf = results?.report?.['weighted avg'] || {};
    const acc = typeof results?.accuracy === 'number' ? results.accuracy : (results?.report?.accuracy || 0) * 100;
    return {
      tn: 0,
      fp: 0,
      fn: 0,
      tp: 0,
      acc,
      precision: (perf.precision || 0) * 100,
      recall: (perf.recall || 0) * 100,
      f1: (perf['f1-score'] || 0) * 100,
    };
  }, [results]);

  const performanceData = useMemo(() => {
    return {
      labels: ['Accuracy', 'Precision', 'Recall', 'F1'],
      datasets: [
        {
          data: [computed.acc, computed.precision, computed.recall, computed.f1],
          backgroundColor: ['#0ea5e9', '#10b981', '#f97316', '#6366f1'],
        },
      ],
    };
  }, [computed]);

  const confusionData = useMemo(() => {
    return {
      labels: ['TP', 'FP', 'FN', 'TN'],
      datasets: [
        {
          data: [computed.tp, computed.fp, computed.fn, computed.tn],
          backgroundColor: ['#0ea5e9', '#f97316', '#fbbf24', '#6366f1'],
        },
      ],
    };
  }, [computed]);

  if (!results) {
    return (
      <div className="text-center text-white/60">
        <p>Run the training step to view results.</p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-white hover:border-white/40"
        >
          <FiRefreshCw /> Start new pipeline
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-emerald-100">
        Model trained successfully  Accuracy {computed.acc.toFixed(2)}%
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-3xl p-5">
          <p className="text-sm text-white/60">Performance</p>
          <Bar data={performanceData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="glass-panel rounded-3xl p-5">
          <p className="text-sm text-white/60">Confusion Matrix</p>
          <Doughnut data={confusionData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      {results?.tree_svg && (
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">Decision Tree</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
              />
              <span className="text-xs text-white/60">{Math.round(scale * 100)}%</span>
            </div>
          </div>
          <div
            className="relative mt-3 h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40"
            onMouseDown={() => setDrag({ dx: 0, dy: 0, active: true })}
            style={{ cursor: drag.active ? 'grabbing' : 'grab' }}
          >
            <div
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
              dangerouslySetInnerHTML={{ __html: results.tree_svg }}
            />
          </div>
        </div>
      )}

      <div className="glass-panel rounded-3xl p-5 overflow-x-auto">
        <p className="text-sm text-white/60">Classification report</p>
        <table className="mt-4 w-full text-sm text-white/70">
          <thead className="text-xs uppercase tracking-widest text-white/40">
            <tr>
              <th className="px-3 py-2 text-left">Class</th>
              <th className="px-3 py-2 text-left">Precision</th>
              <th className="px-3 py-2 text-left">Recall</th>
              <th className="px-3 py-2 text-left">F1</th>
              <th className="px-3 py-2 text-left">Support</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(results.report || {})
              .filter(([key]) => !key.includes('avg') && key !== 'accuracy')
              .map(([label, value]) => (
                <tr key={label} className="border-t border-white/5">
                  <td className="px-3 py-2">{label}</td>
                  <td className="px-3 py-2">{((value.precision || 0) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{((value.recall || 0) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{((value['f1-score'] || 0) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{value.support}</td>
                </tr>
              ))}
            <tr className="border-t border-white/5">
              <td className="px-3 py-2">accuracy</td>
              <td className="px-3 py-2">{computed.acc.toFixed(1)}%</td>
              <td className="px-3 py-2">-</td>
              <td className="px-3 py-2">-</td>
              <td className="px-3 py-2">{Object.entries(results.report || {})
                .filter(([key]) => !key.includes('avg') && key !== 'accuracy')
                .reduce((sum, [, v]) => sum + (v.support || 0), 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ActionBar = ({ label, onSubmit, loading, info }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="text-sm text-white/60">{info || 'Configure this step, then run the action.'}</div>
    <button
      type="button"
      onClick={onSubmit}
      disabled={loading}
      className="btn-primary text-sm"
    >
      {loading ? 'Processing...' : label}
    </button>
  </div>
);

export default PipelineBuilder;
