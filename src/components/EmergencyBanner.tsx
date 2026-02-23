'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Phone, MapPin, ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import BUILDING_DATA from '@/lib/building-mappings.json';

// ══════════════════════════════════════════════════════════════
// Building GPS database — every dorm with its lat/lon
// When GPS finds the user, we pick the nearest BUILDING,
// then look up which front desk serves that building.
// ══════════════════════════════════════════════════════════════

interface DormBuilding {
  name: string;
  latitude: number;
  longitude: number;
}

const DORM_BUILDINGS: DormBuilding[] = [
  // Hill Community buildings (front desk: Hill Hall)
  { name: 'Boggs Hall',       latitude: 33.94856, longitude: -83.37819 },
  { name: 'Church Hall',      latitude: 33.94894, longitude: -83.37831 },
  { name: 'Hill Hall',        latitude: 33.94935, longitude: -83.37823 },
  { name: 'Mell Hall',        latitude: 33.95085, longitude: -83.37873 },
  { name: 'Lipscomb Hall',    latitude: 33.95094, longitude: -83.37831 },
  // Morris Community (own front desk)
  { name: 'Morris Hall',      latitude: 33.95394, longitude: -83.37679 },
  // Myers Community buildings (front desk: Myers Hall)
  { name: 'Myers Hall',       latitude: 33.94665, longitude: -83.37781 },
  { name: 'Soule Hall',       latitude: 33.94633, longitude: -83.37600 },
  { name: 'Mary Lyndon Hall', latitude: 33.94603, longitude: -83.37706 },
  { name: 'Rutherford Hall',  latitude: 33.94681, longitude: -83.37669 },
  // Creswell Community (own front desk)
  { name: 'Creswell Hall',    latitude: 33.95000, longitude: -83.38004 },
  // Russell Community (own front desk)
  { name: 'Russell Hall',     latitude: 33.95006, longitude: -83.38111 },
  // Brumby Community (own front desk)
  { name: 'Brumby Hall',      latitude: 33.94971, longitude: -83.38298 },
  // Reed Community buildings (front desk: Reed Hall)
  { name: 'Reed Hall',        latitude: 33.95109, longitude: -83.37272 },
  { name: 'Payne Hall',       latitude: 33.95169, longitude: -83.37181 },
  // Oglethorpe Community (own front desk)
  { name: 'Oglethorpe House', latitude: 33.94781, longitude: -83.37931 },
  // ECV Community buildings (front desk: Rooker Hall)
  { name: 'Vandiver Hall',    latitude: 33.93744, longitude: -83.36731 },
  { name: 'Rooker Hall',      latitude: 33.93706, longitude: -83.36794 },
  { name: 'McWhorter Hall',   latitude: 33.93831, longitude: -83.36719 },
  { name: 'Busbee Hall',      latitude: 33.93806, longitude: -83.36806 },
  // Brown Community (own front desk — Health Sciences Campus)
  { name: 'Brown Hall',       latitude: 33.96452, longitude: -83.40506 },
  // Highland Community
  { name: 'Highland',         latitude: 33.93500, longitude: -83.38500 },
  // Building 1516 Community (own front desk)
  { name: 'Building 1516',    latitude: 33.93694, longitude: -83.36681 },
  // Rogers Road Community (front desk: University Village)
  { name: 'Rogers Road',      latitude: 33.92806, longitude: -83.37744 },
];

// ══════════════════════════════════════════════════════════════
// Building → Front Desk mapping (source of truth from housing.uga.edu)
// ══════════════════════════════════════════════════════════════

interface FrontDeskInfo {
  name: string;
  phone: string;
  location: string;
  buildings: string[];
}

const FRONT_DESK_BY_BUILDING: Record<string, FrontDeskInfo> = {};

// Build lookup from building-mappings.json communities
const communityData = BUILDING_DATA.communities as Record<string, {
  buildings: string[];
  frontDesk: string;
  frontDeskPhone: string;
  frontDeskLocation: string;
}>;

for (const [, community] of Object.entries(communityData)) {
  const deskInfo: FrontDeskInfo = {
    name: community.frontDesk,
    phone: community.frontDeskPhone,
    location: community.frontDeskLocation,
    buildings: community.buildings,
  };
  for (const building of community.buildings) {
    FRONT_DESK_BY_BUILDING[building.toLowerCase()] = deskInfo;
  }
}

// Deduplicated list of all unique front desks for the picker
const ALL_FRONT_DESKS: FrontDeskInfo[] = [];
const seenDesks = new Set<string>();
for (const [, community] of Object.entries(communityData)) {
  const key = community.frontDeskPhone;
  if (!seenDesks.has(key)) {
    seenDesks.add(key);
    ALL_FRONT_DESKS.push({
      name: community.frontDesk,
      phone: community.frontDeskPhone,
      location: community.frontDeskLocation,
      buildings: community.buildings,
    });
  }
}
ALL_FRONT_DESKS.sort((a, b) => a.name.localeCompare(b.name));

function lookupFrontDesk(buildingName: string): FrontDeskInfo | null {
  const direct = FRONT_DESK_BY_BUILDING[buildingName.toLowerCase()];
  if (direct) return direct;
  const lower = buildingName.toLowerCase();
  for (const [key, desk] of Object.entries(FRONT_DESK_BY_BUILDING)) {
    if (lower.includes(key) || key.includes(lower)) return desk;
  }
  return null;
}

/** Haversine distance in miles */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface EmergencyBannerProps {
  onRequestSchedule?: () => void;
}

export function EmergencyBanner({ onRequestSchedule }: EmergencyBannerProps) {
  const [currentDesk, setCurrentDesk] = useState<FrontDeskInfo | null>(null);
  const [nearestBuilding, setNearestBuilding] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [buildingInput, setBuildingInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeskPicker, setShowDeskPicker] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'found' | 'denied' | 'unavailable'>('pending');

  // GPS → nearest building → front desk
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let closest = DORM_BUILDINGS[0];
        let minDist = haversine(lat, lon, closest.latitude, closest.longitude);
        for (const bldg of DORM_BUILDINGS) {
          const d = haversine(lat, lon, bldg.latitude, bldg.longitude);
          if (d < minDist) {
            minDist = d;
            closest = bldg;
          }
        }
        setNearestBuilding(closest.name);
        const desk = lookupFrontDesk(closest.name);
        if (desk) setCurrentDesk(desk);
        setGpsStatus('found');
      },
      () => {
        setGpsStatus('denied');
      },
    );
  }, []);

  const handleBuildingSearch = useCallback(() => {
    const name = buildingInput.trim().toLowerCase();
    if (!name) return;

    // Try building-mappings buildingLookup first
    const lookup = BUILDING_DATA.buildingLookup as Record<string, string>;
    const communityName = lookup[name];
    if (communityName && communityData[communityName]) {
      const c = communityData[communityName];
      const desk: FrontDeskInfo = {
        name: c.frontDesk,
        phone: c.frontDeskPhone,
        location: c.frontDeskLocation,
        buildings: c.buildings,
      };
      setCurrentDesk(desk);
      setNearestBuilding(name);
      setShowDeskPicker(false);
      setFeedback(`✓ ${desk.name} — ${desk.phone}`);
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    // Try partial match against building names
    const desk = lookupFrontDesk(name);
    if (desk) {
      setCurrentDesk(desk);
      setNearestBuilding(name);
      setShowDeskPicker(false);
      setFeedback(`✓ ${desk.name} — ${desk.phone}`);
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setFeedback('Not found — try the full hall name (e.g. "Boggs Hall")');
    setTimeout(() => setFeedback(null), 4000);
  }, [buildingInput]);

  const handleSelectDesk = (desk: FrontDeskInfo) => {
    setCurrentDesk(desk);
    setShowDeskPicker(false);
    setFeedback(`✓ Switched to ${desk.name}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg overflow-hidden">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-800">
            Emergency? <span className="font-normal text-amber-700">911</span>
            <span className="mx-1.5 text-amber-400">|</span>
            UGA Police <span className="font-normal text-amber-700">(706) 542-2200</span>
            {currentDesk && (
              <>
                <span className="mx-1.5 text-amber-400">|</span>
                <span className="font-normal text-amber-700">
                  {currentDesk.name.replace(' Front Desk', '').replace(' Community', '')} {currentDesk.phone}
                </span>
              </>
            )}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-amber-200 px-4 py-3 space-y-3">
          {/* 911 */}
          <a
            href="tel:911"
            className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Phone className="w-4 h-4 text-red-700" />
            <div>
              <p className="text-sm font-bold text-red-800">Call 911</p>
              <p className="text-xs text-red-600">Life-threatening emergency</p>
            </div>
          </a>

          {/* UGA Police */}
          <a
            href="tel:7065422200"
            className="flex items-center gap-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Phone className="w-4 h-4 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-blue-800">UGA Police — (706) 542-2200</p>
              <p className="text-xs text-blue-600">Non-emergency campus safety</p>
            </div>
          </a>

          {/* Front Desk — with detected building info */}
          {currentDesk && (
            <div className="space-y-1.5">
              <a
                href={`tel:${currentDesk.phone.replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-3 p-2.5 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <MapPin className="w-4 h-4 text-amber-700" />
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    {currentDesk.name} — {currentDesk.phone}
                  </p>
                  <p className="text-xs text-amber-700">
                    {currentDesk.location} · Serves: {currentDesk.buildings.join(', ')}
                  </p>
                </div>
              </a>
              {nearestBuilding && gpsStatus === 'found' && (
                <p className="text-xs text-amber-600 pl-1">
                  📍 Detected near {nearestBuilding}
                </p>
              )}
              <button
                onClick={() => setShowDeskPicker(!showDeskPicker)}
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 underline pl-1"
              >
                <RefreshCw className="w-3 h-3" />
                Not your front desk? Change it
              </button>
            </div>
          )}

          {/* No desk found — prompt user */}
          {!currentDesk && (
            <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">
                {gpsStatus === 'denied'
                  ? '📍 Location access denied — type your dorm below to find your front desk'
                  : gpsStatus === 'unavailable'
                    ? 'Type your dorm name below to find your front desk'
                    : 'Finding your nearest front desk...'}
              </p>
            </div>
          )}

          {/* "Not my desk?" picker — shows all desks */}
          {showDeskPicker && (
            <div className="bg-white border border-amber-200 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs font-semibold text-amber-800 px-1 pb-1">Select your front desk:</p>
              {ALL_FRONT_DESKS.map((desk) => (
                <button
                  key={desk.phone}
                  onClick={() => handleSelectDesk(desk)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                    currentDesk?.phone === desk.phone
                      ? 'bg-amber-200 text-amber-900 font-semibold'
                      : 'hover:bg-amber-50 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{desk.name}</span>
                  <span className="text-gray-500 ml-1">— {desk.phone}</span>
                  <span className="block text-gray-400">{desk.buildings.join(', ')}</span>
                </button>
              ))}
            </div>
          )}

          {/* Building search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-amber-500" />
              <input
                value={buildingInput}
                onChange={(e) => setBuildingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuildingSearch()}
                placeholder="Find your dorm's front desk..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-amber-300 rounded bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={handleBuildingSearch}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
            >
              Find
            </button>
          </div>
          {feedback && <p className="text-xs text-amber-700">{feedback}</p>}
        </div>
      )}
    </div>
  );
}
