import React, { useState } from 'react';
import {
  Search,
  Globe,
  ExternalLink,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { apiFetch } from '../utils/api';

interface SearchResultSource {
  title: string;
  url: string;
}

const TRENDING_SEARCHES = [
  'Latest ISRO Gaganyaan mission developments 2026',
  'India semiconductor and chip fabrication plants updates',
  'Current weather and monsoon status across India',
  'Major discoveries in quantum computing and AI',
];

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [sources, setSources] = useState<SearchResultSource[]>([]);
  const [webQueries, setWebQueries] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q || isLoading) return;

    if (targetQuery) setQuery(targetQuery);

    setIsLoading(true);
    setErrorMessage(null);
    setSearchResult(null);
    setSources([]);
    setWebQueries([]);

    try {
      const data = await apiFetch<{
        text: string;
        sources?: SearchResultSource[];
        searchQueries?: string[];
      }>('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: q }),
      });

      setSearchResult(data.text);
      setSources(data.sources || []);
      setWebQueries(data.searchQueries || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMessage(err.message || 'Error communicating with live web search service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!searchResult) return;
    navigator.clipboard.writeText(searchResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      {/* Banner */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent p-5 dark:border-blue-900/40 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                AGNI Live Grounded Search
              </h1>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Live Web Grounded
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Fresh web discoveries with verified sources and real-time facts, preventing outdated model knowledge.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <div className="pointer-events-none absolute left-4 flex items-center text-neutral-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="search-input-field"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search current news, scientific discoveries, weather, sports..."
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-300 bg-neutral-50 py-3.5 pl-11 pr-28 text-xs sm:text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            id="search-submit-btn"
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Trending Suggestions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            <span>Trending Topics:</span>
          </div>
          {TRENDING_SEARCHES.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSearch(item)}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Search Grounding Details & Answer */}
      {searchResult && (
        <div className="space-y-4 animate-fade-in">
          {/* Main Answer Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Verified Real-Time Intelligence
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="mt-4">
              <MarkdownView content={searchResult} />
            </div>

            {webQueries.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-200/70 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>Web Queries Executed: <strong>{webQueries.join(' • ')}</strong></span>
              </div>
            )}
          </div>

          {/* Sources and Citations Box */}
          {sources.length > 0 && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <span>Verified Sources & Web Citations ({sources.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-2.5 text-xs text-neutral-700 hover:border-blue-400 hover:bg-blue-50/30 transition dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-neutral-200"
                  >
                    <span className="font-medium line-clamp-1">{src.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-500 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
