'use client';

import { ChatComponent } from '@/components/ChatComponent';
import { Navigation } from '@/components/Navigation';
import { RASelector } from '@/components/RASelector';
import RecycleChecker from '@/components/RecycleChecker';
import FAQSection from '@/components/FAQSection';
import UGAEventsPanel from '@/components/UGAEventsPanel';
import { MessageCircle, Users, Recycle, HelpCircle, Calendar, Leaf } from 'lucide-react';

function SectionHeader({ icon: Icon, title, color = 'text-red-700' }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2">
      <div className={`p-1.5 rounded-lg bg-red-50 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-sm font-bold text-gray-700 tracking-tight">{title}</h2>
    </div>
  );
}

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-red-50/30">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-3 py-3 sm:px-4 sm:py-3">
        <div className="max-w-[1440px] mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Left Column: RA Directory + Events */}
          <aside className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto min-h-0">
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
          <div className="lg:col-span-6 min-h-0 flex flex-col">
            <SectionHeader icon={MessageCircle} title="AI Chat Assistant" />
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl shadow-lg border border-gray-200 ring-1 ring-red-100">
              <ChatComponent />
            </div>
          </div>

          {/* Right Column: Recycle Checker + FAQ */}
          <aside className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto min-h-0">
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
    </div>
  );
}

