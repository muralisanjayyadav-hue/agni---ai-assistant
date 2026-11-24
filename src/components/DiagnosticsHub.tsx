import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Mic,
  Volume2,
  Trash2,
  ShieldCheck,
  Terminal,
  Zap,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import {
  runAgniDiagnostics,
  DiagnosticsReport,
  DiagnosticCheck,
} from '../lib/agniDiagnostics';
import { speakText } from '../utils/speech';
import { AgniTestHub } from './AgniTestHub';

interface DiagnosticsHubProps {
  onBack?: () => void;
  defaultTab?: 'diagnostics' | 'test_last_fixes';
}

export const DiagnosticsHub: React.FC<DiagnosticsHubProps> = ({ onBack, defaultTab = 'diagnostics' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'diagnostics' | 'test_last_fixes'>(defaultTab);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'failed' | 'warn' | 'passed'>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const runCheck = async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const result = await runAgniDiagnostics();
      setReport(result);
    } catch (err: any) {
      console.error('[AGNI BUG FINDER] Diagnostics run failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const handleCopyReport = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAction = async (check: DiagnosticCheck) => {
    setActionFeedback(null);

    if (check.actionType === 'request_mic') {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          setActionFeedback('✅ Microphone permission granted successfully! Re-running checks...');
          setTimeout(runCheck, 1000);
        } else {
          setActionFeedback('❌ mediaDevices.getUserMedia not supported or requires HTTPS.');
        }
      } catch (err: any) {
        setActionFeedback(`⚠️ Microphone request rejected: ${err?.message || 'Permission denied'}`);
      }
    } else if (check.actionType === 'test_tts') {
      try {
        speakText('AGNI text-to-speech audio synthesis is operational.');
        setActionFeedback('🔊 Played test audio tone.');
        setTimeout(runCheck, 1500);
      } catch (err: any) {
        setActionFeedback(`❌ Speech error: ${err?.message}`);
      }
    } else if (check.actionType === 'clear_storage') {
      try {
        const preserveKeys = ['agni_auth_user', 'agni_user_prefs'];
        const saved: Record<string, string> = {};
        preserveKeys.forEach((k) => {
          const val = localStorage.getItem(k);
          if (val) saved[k] = val;
        });
        localStorage.clear();
        Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
        sessionStorage.clear();
        setActionFeedback('🧹 Cleared temporary storage while preserving session credentials.');
        setTimeout(runCheck, 800);
      } catch (err: any) {
        setActionFeedback(`❌ Storage clear error: ${err?.message}`);
      }
    } else if (check.actionType === 'open_vercel') {
      window.open('https://vercel.com/dashboard', '_blank');
      setActionFeedback('🔗 Opened Vercel Dashboard in new tab.');
    } else if (check.actionType === 'retry_api') {
      runCheck();
    }
  };

  const filteredChecks = (report?.checks || []).filter((c) => {
    if (filter === 'failed') return c.status === 'fail';
    if (filter === 'warn') return c.status === 'warn';
    if (filter === 'passed') return c.status === 'pass';
    return true;
  });

  const bugCount = (report?.summary.failed || 0) + (report?.summary.warned || 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-orange-500/40 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Bar Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>AGNI Bug Finder &amp; Self-Diagnostics</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                    <Zap className="h-3 w-3" />
                    <span>Live Telemetry</span>
                  </span>
                </h1>
              </div>
              <p className="text-xs text-neutral-400">
                Self-inspecting Groq keys, STT mic stream, TTS speech, API health, storage, and runtime stability.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              disabled={!report || isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              title="Copy JSON debug report"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Report Copied' : 'Copy Report'}</span>
            </button>

            <button
              type="button"
              onClick={runCheck}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scanning AGNI...' : '🔍 Run Full Diagnostics'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('diagnostics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'diagnostics'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>🔍 Self-Diagnostics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('test_last_fixes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'test_last_fixes'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>🧪 Test Last Fixes</span>
          </button>
        </div>

        {activeSubTab === 'test_last_fixes' ? (
          <AgniTestHub onBack={() => setActiveSubTab('diagnostics')} />
        ) : (
          <>
        {/* Action feedback toast */}
        {actionFeedback && (
          <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-3 text-xs text-cyan-200 animate-fadeIn flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-cyan-400 hover:text-cyan-100 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Diagnostics Summary Header Card */}
        {report && (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-md p-5 sm:p-6 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Score Dial */}
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-neutral-900 to-neutral-800 border border-neutral-700 flex flex-col items-center justify-center shrink-0">
                  <span
                    className={`text-xl font-black ${
                      report.summary.healthScore >= 90
                        ? 'text-emerald-400'
                        : report.summary.healthScore >= 70
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {report.summary.healthScore}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">Health</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">System Status</h3>
                  <p className="text-xs text-neutral-400">
                    {bugCount === 0
                      ? 'All systems fully operational.'
                      : `AGNI detected ${bugCount} potential issue${bugCount > 1 ? 's' : ''}.`}
                  </p>
                </div>
              </div>

              {/* Passed Count */}
              <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-base font-black text-white">{report.summary.passed} Passed</div>
                  <div className="text-[11px] text-neutral-400">Core capabilities ready</div>
                </div>
              </div>

              {/* Warnings Count */}
              <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-base font-black text-white">{report.summary.warned} Warnings</div>
                  <div className="text-[11px] text-neutral-400">Sub-optimal or fallback</div>
                </div>
              </div>

              {/* Failed Count */}
              <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-3">
                <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <XCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-base font-black text-white">{report.summary.failed} Bugs / Failed</div>
                  <div className="text-[11px] text-neutral-400">Requires attention</div>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mt-5 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({report.summary.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('failed')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    filter === 'failed'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Bugs ({report.summary.failed})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('warn')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    filter === 'warn'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Warnings ({report.summary.warned})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('passed')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                    filter === 'passed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Passed ({report.summary.passed})
                </button>
              </div>

              <div className="text-[11px] text-neutral-400">
                Last scanned: {new Date(report.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Checks List */}
        <div className="space-y-3">
          {filteredChecks.map((check) => {
            const isPass = check.status === 'pass';
            const isWarn = check.status === 'warn';
            const isFail = check.status === 'fail';

            return (
              <div
                key={check.id}
                className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                  isPass
                    ? 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    : isWarn
                    ? 'border-amber-500/30 bg-amber-950/20'
                    : 'border-red-500/40 bg-red-950/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isPass && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      {isWarn && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                      {isFail && <XCircle className="h-5 w-5 text-red-400" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{check.name}</h4>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isPass
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isWarn
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {check.status}
                        </span>
                        {check.latencyMs !== undefined && (
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                            {check.latencyMs}ms
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-neutral-300 leading-relaxed">{check.message}</p>

                      {/* Auto Fix Hint */}
                      {check.fix && (
                        <div className="mt-2 text-xs flex items-start gap-1.5 text-neutral-400 bg-neutral-900/80 border border-neutral-800 rounded-xl p-2.5">
                          <span className="font-bold text-orange-400 shrink-0">Fix Hint:</span>
                          <span className="text-neutral-300">{check.fix}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fix Action Button */}
                  {check.actionType && (
                    <div className="shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleAction(check)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isFail
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20'
                            : 'bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        {check.actionType === 'request_mic' && <Mic className="h-3.5 w-3.5 text-orange-400" />}
                        {check.actionType === 'test_tts' && <Volume2 className="h-3.5 w-3.5 text-cyan-400" />}
                        {check.actionType === 'clear_storage' && <Trash2 className="h-3.5 w-3.5 text-amber-400" />}
                        {check.actionType === 'open_vercel' && <ExternalLink className="h-3.5 w-3.5 text-blue-400" />}
                        {check.actionType === 'retry_api' && <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />}
                        <span>
                          {check.actionType === 'request_mic' && 'Request Mic Permission'}
                          {check.actionType === 'test_tts' && 'Test Voice Speech'}
                          {check.actionType === 'clear_storage' && 'Clear Storage'}
                          {check.actionType === 'open_vercel' && 'Open Vercel Env'}
                          {check.actionType === 'retry_api' && 'Retry Check'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Runtime Bug Log Section */}
        {report && (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-orange-500" />
                <h3 className="font-bold text-sm text-white">Runtime Error &amp; Bug Log (Last 5 Mins)</h3>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {report.recentErrors.length} captured
              </span>
            </div>

            {report.recentErrors.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero runtime errors or unhandled promise rejections logged. Core is stable.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-[11px]">
                {report.recentErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-red-500/20 bg-red-950/20 p-2.5 text-red-300 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>Entry #{idx + 1}</span>
                      <span>{err.timestamp}</span>
                    </div>
                    <div className="font-medium text-white break-words">{err.message}</div>
                    {err.stack && (
                      <pre className="text-[9px] text-neutral-400 whitespace-pre-wrap max-h-20 overflow-y-auto">
                        {err.stack}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
