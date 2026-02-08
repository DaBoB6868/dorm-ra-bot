'use client';

import { useState } from 'react';
import { ChatComponent } from '@/components/ChatComponent';
import { Navigation } from '@/components/Navigation';
import { RASelector } from '@/components/RASelector';
import RecycleChecker from '@/components/RecycleChecker';
import FAQSection from '@/components/FAQSection';
import UGAEventsPanel from '@/components/UGAEventsPanel';
import { MessageCircle, Users, Recycle, HelpCircle, Calendar } from 'lucide-react';

/* ── Section header (desktop only, hidden on mobile) ── */
function SectionHeader({ icon: Icon, title, color = 'text-red-700' }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div className="hidden lg:flex items-center gap-2 px-1 mb-2">
      <div className={`p-1.5 rounded-lg bg-red-50 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-sm font-bold text-gray-700 tracking-tight">{title}</h2>
    </div>
  );
}

/* ── Mobile tab definitions ── */
const MOBILE_TABS = [
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'ra', label: 'Find RA', icon: Users },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'recycle', label: 'Recycle', icon: Recycle },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
] as const;

type TabKey = (typeof MOBILE_TABS)[number]['key'];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-red-50/30">
      {/* Navigation */}
      <Navigation />

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT — unchanged, hidden on small screens
          ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 overflow-hidden px-4 py-3">
        <div className="max-w-[1440px] mx-auto h-full w-full grid grid-cols-12 gap-3">
          {/* Left Column: RA Directory + Events */}
          <aside className="col-span-3 flex flex-col gap-3 overflow-y-auto min-h-0">
            <div>
              <SectionHeader icon={Users} title="RA Directory" />
              <RASelector />
            </div>
            <div className="flex-1 min-h-[300px] flex flex-col">
              <SectionHeader icon={Calendar} title="Campus Events" />
              <div className="flex-1 min-h-0">
                <UGAEventsPanel />
              </div>
            </div>
          </aside>

          {/* Center: Chat AI */}
          <div className="col-span-6 min-h-0 flex flex-col">
            <SectionHeader icon={MessageCircle} title="AI Chat Assistant" />
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl shadow-lg border border-gray-200 ring-1 ring-red-100">
              <ChatComponent />
            </div>
          </div>

          {/* Right Column: Recycle Checker + FAQ */}
          <aside className="col-span-3 flex flex-col gap-3 overflow-y-auto min-h-0">
            <div>
              <SectionHeader icon={Recycle} title="Recycle Checker" color="text-green-700" />
              <RecycleChecker />
            </div>
            <div className="flex-1">
              <SectionHeader icon={HelpCircle} title="FAQ" />
              <FAQSection />
            </div>
          </aside>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT — tab-based, shown only on small screens
          ═══════════════════════════════════════════════════════ */}
      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
        {/* Active panel content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              <ChatComponent />
            </div>
          )}
          {activeTab === 'ra' && (
            <div className="p-3 pb-4">
              <RASelector />
            </div>
          )}
          {activeTab === 'events' && (
            <div className="p-3 pb-4 h-full flex flex-col">
              <UGAEventsPanel />
            </div>
          )}
          {activeTab === 'recycle' && (
            <div className="p-3 pb-4">
              <RecycleChecker />
            </div>
          )}
          {activeTab === 'faq' && (
            <div className="p-3 pb-4">
              <FAQSection />
            </div>
          )}
        </div>

        {/* ── Bottom Tab Bar ── */}
        <nav className="flex-shrink-0 bg-white border-t-2 border-gray-200 safe-area-bottom">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            {MOBILE_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-red-700 scale-105'
                      : 'text-gray-400 hover:text-gray-600 active:scale-95'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-red-50' : ''}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-red-700' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

