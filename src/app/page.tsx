'use client';

import { ChatComponent } from '@/components/ChatComponent';
import { Navigation } from '@/components/Navigation';
import RecycleChecker from '@/components/RecycleChecker';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden px-4 py-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <ChatComponent />
          </div>
          <aside className="md:col-span-1">
            <RecycleChecker />
          </aside>
        </div>
      </div>
    </div>
  );
}

