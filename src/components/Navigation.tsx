import React from 'react';
import {
  ArrowLeft,
  Home,
  MessageSquare,
  Heart,
  Mic,
  GraduationCap,
  Eye,
  FileText,
  Search,
  Cpu,
  Brain,
  MessageCircle,
  HardDrive,
  PenTool,
  CalendarCheck,
  Settings as SettingsIcon,
} from 'lucide-react';
import { TabMode } from '../types';

interface NavigationProps {
  activeTab: TabMode;
  onSelectTab: (tab: TabMode) => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
}

interface NavItem {
  id: TabMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'voice', label: 'Voice Chat', icon: Mic, badge: 'Voice Core' },
  { id: 'vision', label: 'Vision AI', icon: Eye, badge: 'AR Live' },
  { id: 'canvas', label: 'AGNI Canvas', icon: PenTool, badge: 'Interactive' },
  { id: 'life_os', label: 'Smart Life OS', icon: CalendarCheck, badge: 'Planner' },
  { id: 'learn', label: 'Student Learn', icon: GraduationCap, badge: 'Pillar' },
  { id: 'offline', label: 'Offline Lite', icon: HardDrive, badge: 'Zero Net' },
  { id: 'bot', label: 'WhatsApp & Telegram', icon: MessageCircle, badge: 'Bot' },
  { id: 'documents', label: 'Docs & PDF', icon: FileText },
  { id: 'search', label: 'Live Search', icon: Search },
  { id: 'actions', label: 'Device Actions', icon: Cpu },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, badge: 'Power & Vol' },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  canGoBack = false,
  onGoBack,
}) => {
  return (
    <nav className="border-b border-neutral-200/80 bg-neutral-50/90 dark:border-neutral-800 dark:bg-neutral-900/90 relative z-20 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-2 sm:px-6">
        <div className="flex items-center gap-1.5 py-2">
          {/* Back Button */}
          {canGoBack && onGoBack && (
            <button
              id="global-back-nav-btn"
              type="button"
              onClick={onGoBack}
              title="Go Back to Previous Screen"
              className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 shadow-sm hover:bg-neutral-100 hover:border-orange-500 hover:text-orange-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 dark:hover:border-orange-500 shrink-0 transition-all cursor-pointer group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
          )}

          {/* Scrollable Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm shadow-orange-600/25 scale-[1.02]'
                      : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
