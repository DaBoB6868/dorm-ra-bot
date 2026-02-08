'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, MessageCircle, MapPin } from 'lucide-react';
import { EmergencyBanner } from './EmergencyBanner';
import { ScheduleModal } from './ScheduleModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('');
  const [locationSet, setLocationSet] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          stream: false,
          userLocation: userLocation || undefined,
        }),
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || JSON.stringify(errorData);
        } catch {
          errorDetail = await response.text();
        }
        console.error(`API Error (${response.status}):`, errorDetail);
        throw new Error(`Failed to get response: ${response.status} - ${errorDetail}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content:
          'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Emergency Warning Tag - always visible at top */}
      <div className="px-2 pt-2 sm:px-3 sm:pt-3">
        <EmergencyBanner onRequestSchedule={() => setShowScheduleModal(true)} />
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {messages.length === 0 ? (
          // Landing Page - Empty State
          <div className="flex flex-col items-center justify-center h-full px-2">
            {/* Animated Bot Icon */}
            <div className="mb-4 sm:mb-8 relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" style={{ width: '80px', height: '80px' }}></div>
              <div className="relative w-16 h-16 sm:w-24 sm:h-24 bg-red-700 rounded-full flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>

            {/* Greeting Text */}
            <h1 className="text-2xl sm:text-5xl font-bold text-gray-900 mb-2 sm:mb-4 text-center">
              How can I help?
            </h1>
            <p className="text-sm sm:text-xl text-gray-800 text-center mb-4 sm:mb-6 max-w-md">
              Ask about campus resources, dorm policies, and residential life
            </p>

            {/* Location Input */}
            <div className="flex items-center gap-2 mb-4 sm:mb-8 w-full max-w-sm">
              <MapPin className="w-4 h-4 text-red-700 flex-shrink-0" />
              <input
                type="text"
                value={userLocation}
                onChange={(e) => { setUserLocation(e.target.value); setLocationSet(false); }}
                onBlur={() => { if (userLocation.trim()) setLocationSet(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && userLocation.trim()) setLocationSet(true); }}
                placeholder="Your dorm (e.g. Creswell Hall)..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-700 text-gray-900 placeholder:text-gray-400"
              />
              {locationSet && <span className="text-xs text-green-600 font-medium">✓ Set</span>}
            </div>

            {/* Quick Questions */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-2xl">
              {[
                'What are dorm quiet hours?',
                'How do I report maintenance issues?',
                'What are the visitor policies?',
                'Where is campus security located?',
              ].map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(question);
                    setTimeout(() => {
                      document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }));
                    }, 0);
                  }}
                  className="p-3 sm:p-4 border-2 border-gray-300 rounded-xl text-left hover:border-red-700 hover:bg-red-50 active:bg-red-100 active:scale-[0.98] transition-all group"
                >
                  <p className="text-xs sm:text-base text-gray-800 group-hover:text-red-700 font-medium leading-snug">{question}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Chat Messages
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-lg px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-red-700 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>

                  {message.sources && message.sources.length > 0 && (
                    <button
                      onClick={() =>
                        setShowSources(
                          showSources === message.id ? null : message.id
                        )
                      }
                      className={`text-xs mt-2 underline cursor-pointer ${
                        message.role === 'user'
                          ? 'text-red-100 hover:text-white'
                          : 'text-red-700 hover:text-red-900'
                      }`}
                    >
                      {showSources === message.id ? 'Hide' : 'Show'} sources (
                      {message.sources.length})
                    </button>
                  )}

                  {showSources === message.id && message.sources && (
                    <div className="mt-2 pt-2 border-t border-gray-300 text-xs space-y-1">
                      {message.sources.map((source, idx) => (
                        <div
                          key={idx}
                          className={`${
                            message.role === 'user'
                              ? 'text-red-100'
                              : 'text-gray-800'
                          }`}
                        >
                          📄 {source}
                        </div>
                      ))}
                    </div>
                  )}

                  <span
                    className={`text-xs mt-2 block ${
                      message.role === 'user'
                        ? 'text-red-100'
                        : 'text-gray-600'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin text-red-700" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-gray-200 bg-white p-2 sm:p-6">
        <form onSubmit={handleSendMessage} className="flex space-x-2 sm:space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-700 disabled:bg-gray-100 transition-colors text-gray-900 placeholder:text-gray-500 text-sm sm:text-base"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-red-700 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl hover:bg-red-800 active:bg-red-900 disabled:bg-gray-400 transition-colors flex items-center space-x-1 sm:space-x-2 font-medium"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
      <ScheduleModal open={showScheduleModal} onClose={() => setShowScheduleModal(false)} frontDeskName={undefined} />
    </div>
  );
}
