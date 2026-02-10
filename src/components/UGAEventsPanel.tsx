'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Clock, RefreshCw, ExternalLink, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface UGAEvent {
  title: string;
  link: string;
  imageUrl?: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  host: string;
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
}

function getDayLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'Today';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  return formatEventDate(dateStr);
}

const categoryColors: Record<string, string> = {
  Social: 'bg-blue-100 text-blue-700',
  Health: 'bg-green-100 text-green-700',
  Arts: 'bg-purple-100 text-purple-700',
  Spirituality: 'bg-amber-100 text-amber-700',
  ThoughtfulLearning: 'bg-indigo-100 text-indigo-700',
  Athletics: 'bg-orange-100 text-orange-700',
  CommunityService: 'bg-teal-100 text-teal-700',
  Fundraising: 'bg-pink-100 text-pink-700',
  GroupBusiness: 'bg-gray-100 text-gray-700',
  General: 'bg-red-100 text-red-700',
  'Service / Volunteer Opportunities': 'bg-teal-100 text-teal-700',
};

export default function UGAEventsPanel() {
  const [events, setEvents] = useState<UGAEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEvents(data.events || []);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    } catch {
      setError('Unable to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Refresh every 10 minutes
    const interval = setInterval(fetchEvents, 600000);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((event) => event.category).filter(Boolean))
    ).sort();
    return ['All', ...unique];
  }, [events]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categories, activeCategory]);

  const visibleEvents = useMemo(() => {
    if (activeCategory === 'All') return events;
    return events.filter((event) => event.category === activeCategory);
  }, [events, activeCategory]);

  // Group events by day
  const groupedEvents: Record<string, UGAEvent[]> = {};
  visibleEvents.forEach((event) => {
    const label = getDayLabel(event.startDate);
    if (!groupedEvents[label]) groupedEvents[label] = [];
    groupedEvents[label].push(event);
  });

  const getCategoryStyle = (cat: string) => categoryColors[cat] || categoryColors.General;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <h2 className="font-bold text-sm">UGA Campus Events</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap(!showMap)}
            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            {showMap ? 'Events' : 'Map'}
          </button>
          <button
            onClick={fetchEvents}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Refresh events"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map View */}
      {showMap && (
        <div className="relative w-full" style={{ height: '200px' }}>
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-83.385%2C33.94%2C-83.36%2C33.955&layer=mapnik&marker=33.948%2C-83.373"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            title="UGA Campus Map"
          />
          <a
            href="https://www.openstreetmap.org/#map=16/33.948/-83.373"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 bg-white/90 text-xs px-2 py-1 rounded shadow hover:bg-white transition-colors text-gray-700 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Full Map
          </a>
        </div>
      )}

      {/* Category Filters */}
      {categories.length > 1 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-white">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
            <span className="ml-2 text-sm text-gray-500">Loading events...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-500">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-500">No events found for {activeCategory}.</p>
            {activeCategory !== 'All' && (
              <button
                onClick={() => setActiveCategory('All')}
                className="mt-2 text-xs text-red-600 hover:underline"
              >
                Show all events
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedEvents).map(([dayLabel, dayEvents]) => (
              <DayGroup key={dayLabel} label={dayLabel} events={dayEvents} getCategoryStyle={getCategoryStyle} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Updated {lastUpdated}</span>
          <a
            href="https://uga.campuslabs.com/engage/events"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-red-600 hover:underline flex items-center gap-1"
          >
            View all on UGA Engage <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function DayGroup({
  label,
  events,
  getCategoryStyle,
}: {
  label: string;
  events: UGAEvent[];
  getCategoryStyle: (cat: string) => string;
}) {
  const [expanded, setExpanded] = useState(label === 'Today' || label === 'Tomorrow');

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className={`text-xs font-bold ${label === 'Today' ? 'text-red-600' : 'text-gray-600'}`}>
          {label}
          <span className="ml-2 text-gray-400 font-normal">({events.length})</span>
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="divide-y divide-gray-50">
          {events.map((event, idx) => (
            <EventCard key={`${event.link}-${idx}`} event={event} getCategoryStyle={getCategoryStyle} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  getCategoryStyle,
}: {
  event: UGAEvent;
  getCategoryStyle: (cat: string) => string;
}) {
  return (
    <a
      href={event.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-4 py-3 hover:bg-red-50/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Time badge */}
        <div className="flex-shrink-0 w-14 text-center">
          <div className="text-xs font-bold text-red-600">
            {formatEventTime(event.startDate)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {formatEventTime(event.endDate)}
          </div>
        </div>

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-800 group-hover:text-red-700 transition-colors truncate">
            {event.title}
          </h4>

          {event.location && !event.location.startsWith('http') && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{event.location}</span>
            </div>
          )}

          {event.host && (
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">{event.host}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCategoryStyle(event.category)}`}>
              {event.category}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
