import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Activity, Copy, Check } from 'lucide-react';
import { logRuntimeBug } from '../lib/agniDiagnostics';

interface Props {
  children: ReactNode;
  onOpenDiagnostics?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class AgniErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AGNI BUG FINDER] React caught render exception:', error, errorInfo);
    logRuntimeBug(`React Error: ${error.message}`, errorInfo.componentStack || undefined);
    this.setState({ errorInfo });
  }

  private handleCopy = () => {
    const errorDetails = JSON.stringify(
      {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        url: window.location.href,
        time: new Date().toISOString(),
      },
      null,
      2
    );
    navigator.clipboard.writeText(errorDetails);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4 selection:bg-orange-500/40">
          <div className="w-full max-w-xl rounded-3xl border border-red-500/30 bg-neutral-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-red-950/50">
            {/* Header Icon & Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">AGNI Self-Heal: Bug Intercepted</h2>
                <p className="text-xs text-neutral-400">A runtime issue was safely isolated to protect your session.</p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="rounded-2xl border border-neutral-800 bg-black/60 p-4 mb-6 font-mono text-xs text-red-300 overflow-x-auto max-h-48">
              <p className="font-bold text-white mb-1">Error Trace:</p>
              <p>{this.state.error?.message || 'Unknown runtime error'}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.trim().slice(0, 400)}...
                </pre>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload AGNI</span>
              </button>

              {this.props.onOpenDiagnostics && (
                <button
                  type="button"
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    this.props.onOpenDiagnostics?.();
                  }}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 py-3 text-xs font-bold text-white transition cursor-pointer"
                >
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span>Run Diagnostics</span>
                </button>
              )}

              <button
                type="button"
                onClick={this.handleCopy}
                className="px-4 py-3 rounded-2xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                title="Copy error report"
              >
                {this.state.copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{this.state.copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
