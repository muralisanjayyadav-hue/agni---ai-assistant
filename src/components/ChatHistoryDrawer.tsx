import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  Clock,
  Check,
  Edit2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onClearAllSessions,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex w-full max-w-xs flex-col bg-white dark:bg-neutral-900 shadow-2xl border-r border-neutral-200 dark:border-neutral-800 animate-slide-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <h2 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Chat History
            </h2>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {sessions.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={() => {
              onCreateNewSession();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 px-3 text-xs font-bold text-white shadow-sm hover:from-orange-600 hover:to-amber-600 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No saved conversations yet.</p>
              <p className="text-[11px] text-neutral-500 mt-1">Start chatting to auto-save history!</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isConfirming = confirmDeleteId === session.id;

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition ${
                    isActive
                      ? 'bg-orange-50 font-semibold text-orange-950 dark:bg-orange-950/40 dark:text-orange-200 border border-orange-200/80 dark:border-orange-900/50'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className="flex flex-1 items-start gap-2.5 text-left truncate pr-2 cursor-pointer"
                  >
                    <MessageSquare className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-400'}`} />
                    <div className="truncate flex-1">
                      <p className="truncate text-xs">{session.title || 'Untitled Conversation'}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-400 font-normal">
                        <span>{session.messages?.length || 0} msgs</span>
                        <span>•</span>
                        <span>{session.updatedAt || session.createdAt}</span>
                      </div>
                    </div>
                  </button>

                  {/* Delete button or confirm */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1 shrink-0 animate-fade-in">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                          setConfirmDeleteId(null);
                        }}
                        title="Confirm Delete"
                        className="rounded bg-red-600 p-1 text-white hover:bg-red-700 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        title="Cancel"
                        className="rounded bg-neutral-200 p-1 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(session.id);
                      }}
                      title="Delete Session"
                      className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-neutral-400 hover:text-red-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {sessions.length > 0 && (
          <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
            {showClearAllModal ? (
              <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-900 dark:bg-red-950/40 dark:text-red-200 space-y-2 border border-red-200 dark:border-red-900">
                <p className="font-semibold text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  Clear all chat history?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllSessions();
                      setShowClearAllModal(false);
                    }}
                    className="flex-1 rounded-lg bg-red-600 py-1 text-center font-bold text-white hover:bg-red-700 transition cursor-pointer"
                  >
                    Yes, Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearAllModal(false)}
                    className="flex-1 rounded-lg bg-neutral-200 py-1 text-center font-medium text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All History</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
