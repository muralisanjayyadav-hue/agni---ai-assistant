import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  RotateCw,
  Mic,
  Terminal,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Flame,
} from 'lucide-react';
import {
  runFullAgniTests,
  AgniTestSuiteReport,
  AgniTestCase,
} from '../lib/agniTestSuite';
import { speakText } from '../utils/speech';

interface AgniTestHubProps {
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AgniTestHub: React.FC<AgniTestHubProps> = ({ onBack, onNavigateTab }) => {
  const [report, setReport] = useState<AgniTestSuiteReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'failed' | 'passed'>('all');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [activeActionFeedback, setActiveActionFeedback] = useState<string | null>(null);

  const addConsoleLog = (msg: string) => {
    setConsoleLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 40),
    ]);
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setActiveActionFeedback(null);
    addConsoleLog('Running full automated test suite for last fixes...');

    try {
      const result = await runFullAgniTests();
      setReport(result);

      if (result.lastGroqKeyUsed) {
        addConsoleLog(result.lastGroqKeyUsed);
      }
      result.tests.forEach((t) => {
        addConsoleLog(`${t.status === 'pass' ? 'PASS' : 'FAIL'}: ${t.name} -> ${t.log}`);
      });

      if (result.summary.allPassed) {
        speakText(`Tested ${result.summary.total} checks, ${result.summary.passed} pass, all last fixes working.`);
      } else {
        speakText(`Found bug in ${result.tests.find(t => t.status === 'fail')?.name || 'test suite'}, check test page.`);
      }
    } catch (err: any) {
      console.error('[AGNI TEST SUITE] Test runner threw:', err);
      addConsoleLog(`ERROR: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    addConsoleLog('Copied complete JSON test report to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRerunGroq = async () => {
    addConsoleLog('Re-running isolated Groq Circle Test...');
    await runAllTests();
    setActiveActionFeedback('✅ Re-ran Groq 9 Keys Circle Test!');
    setTimeout(() => setActiveActionFeedback(null), 3000);
  };

  const handleRerunSTT = async () => {
    addConsoleLog('Re-running isolated STT Live Typing Test...');
    await runAllTests();
    setActiveActionFeedback('✅ Re-ran STT Live Typing Test!');
    setTimeout(() => setActiveActionFeedback(null), 3000);
  };

  const filteredTests = report?.tests.filter((t) => {
    if (filter === 'failed') return t.status === 'fail';
    if (filter === 'passed') return t.status === 'pass';
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                title="Go Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  AGNI Automated Test Suite
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  Test Again What We Did Last Time
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Verifies Groq 9 Keys Circle, STT Live Typing, Diagnostics Hub, Chat Interceptors, and Founder Identity.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('diagnostics')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-neutral-700 transition"
              >
                <span>🔍 Open Diagnostics</span>
              </button>
            )}
            <button
              onClick={handleCopyReport}
              disabled={!report}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-neutral-700 transition disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Test Report'}</span>
            </button>
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Running Tests...' : '🧪 Run All Tests Again'}</span>
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {activeActionFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <span>{activeActionFeedback}</span>
          </div>
        )}

        {/* Health Score Summary Card */}
        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${report.summary.allPassed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'} flex flex-col justify-between`}>
              <span className="text-xs text-neutral-400 font-medium">Test Status</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${report.summary.allPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {report.summary.passed}/{report.summary.total}
                </span>
                <span className="text-xs text-neutral-400">checks pass</span>
              </div>
              <p className="text-xs mt-2 font-medium text-neutral-300">
                {report.summary.allPassed
                  ? 'All we did last time WORKING! 100% Health'
                  : `${report.summary.failed} bug(s) found`}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">Groq Rotation Circle</span>
              <div className="mt-2 flex items-center gap-2">
                <RotateCw className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-300 font-mono">
                  {report.lastGroqKeyUsed || '1 -> 2 -> 3... -> 9 -> 1'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Active round-robin auto-advance</p>
            </div>

            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">Live STT Streaming</span>
              <div className="mt-2 flex items-center gap-2">
                <Mic className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">
                  interimResults=true
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Pushes live to all 3 bottom boxes</p>
            </div>

            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">Founder Mandate</span>
              <div className="mt-2 flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-bold text-amber-300">
                  M. Sanjay
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Affirmed in all models (never Meta)</p>
            </div>
          </div>
        )}

        {/* Action Quick Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRerunGroq}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40 text-xs font-medium transition"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Re-run Groq Test</span>
          </button>
          <button
            onClick={handleRerunSTT}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-medium transition"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Re-run STT Test</span>
          </button>
          <div className="ml-auto flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${filter === 'all' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'}`}
            >
              All ({report?.tests.length || 0})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-2.5 py-1 rounded-lg transition ${filter === 'failed' ? 'bg-red-950 text-red-300 font-semibold' : 'text-neutral-400 hover:text-white'}`}
            >
              Failed ({report?.summary.failed || 0})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-2.5 py-1 rounded-lg transition ${filter === 'passed' ? 'bg-emerald-950 text-emerald-300 font-semibold' : 'text-neutral-400 hover:text-white'}`}
            >
              Passed ({report?.summary.passed || 0})
            </button>
          </div>
        </div>

        {/* Tests List */}
        <div className="space-y-3">
          {filteredTests.map((test, idx) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border transition ${
                test.status === 'pass'
                  ? 'bg-neutral-900/30 border-neutral-800/80 hover:border-neutral-700'
                  : 'bg-red-950/20 border-red-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {test.status === 'pass' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 font-mono">#{idx + 1}</span>
                      <h3 className="text-sm font-semibold text-white">{test.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        test.status === 'pass'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {test.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-0.5">Expected:</span>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">{test.expected}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-0.5">Actual:</span>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">{test.actual}</p>
                      </div>
                    </div>

                    {test.log && (
                      <div className="text-[11px] font-mono text-neutral-400 pt-1">
                        <code>{test.log}</code>
                      </div>
                    )}

                    {test.fix && test.status === 'fail' && (
                      <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                        <span className="font-bold">Auto-Fix Suggestion:</span> {test.fix}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Console Log Viewer */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-neutral-300">
                AGNI Live Test Console &amp; Key Rotation Log
              </span>
            </div>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-[11px] text-neutral-500 hover:text-neutral-300 transition"
            >
              Clear Logs
            </button>
          </div>
          <div className="p-4 max-h-56 overflow-y-auto font-mono text-[11px] space-y-1 text-neutral-400">
            {consoleLogs.length === 0 ? (
              <p className="text-neutral-600 italic">No logs yet. Run tests to stream output.</p>
            ) : (
              consoleLogs.map((log, i) => (
                <div
                  key={i}
                  className={`leading-relaxed ${
                    log.includes('FAIL') || log.includes('ERROR')
                      ? 'text-red-400 font-semibold'
                      : log.includes('PASS')
                      ? 'text-emerald-400'
                      : log.includes('Using Groq Key')
                      ? 'text-cyan-300 font-semibold'
                      : 'text-neutral-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
