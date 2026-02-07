'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, MapPin, Phone, X } from 'lucide-react';
import BUILDING_MAP from '@/lib/building-mappings.json';

interface FrontDesk {
  name: string;
  latitude: number;
  longitude: number;
  phone: string;
  buildings: string[];
}

const FRONT_DESKS: FrontDesk[] = [
  {
    name: 'Hill Community Front Desk',
    latitude: 33.9516,
    longitude: -83.3732,
    phone: '(706) 542-5000',
    buildings: ['Boggs Hall', 'Church Hill', 'Mell Hall', 'Morris Hall'],
  },
    {
      name: 'Hill Community Front Desk',
      latitude: 33.9556,
      longitude: -83.3774,
      phone: '706-542-1234',
      buildings: ['Hill', 'Creswell', 'Myers', 'Boggs', 'Boggs Hall', 'Boggs-A'],
    },
  {
    name: 'Russell Front Desk',
    latitude: 33.9505,
    longitude: -83.3750,
    phone: '(706) 542-5002',
    buildings: ['Russell Hall'],
  },
  {
    name: 'Creswell Front Desk',
    latitude: 33.9535,
    longitude: -83.3760,
    phone: '(706) 542-5003',
    buildings: ['Creswell Hall'],
  },
  {
    name: 'Myers Front Desk',
    latitude: 33.9545,
    longitude: -83.3770,
    phone: '(706) 542-5004',
    buildings: ['Myers Hall', 'Myers Quad'],
  },
  {
    name: 'Reed Front Desk',
    latitude: 33.9555,
    longitude: -83.3780,
    phone: '(706) 542-5005',
    buildings: ['Reed Hall'],
  },
    {
      name: 'Reed Community Front Desk',
      latitude: 33.9525,
      longitude: -83.3765,
      phone: '706-542-6789',
      buildings: ['Reed', 'Payne'],
    },
  {
    name: 'Payne Front Desk',
    latitude: 33.9565,
    longitude: -83.3790,
    phone: '(706) 542-5006',
    buildings: ['Payne Hall'],
  },
];

interface EmergencyBannerProps {
  onClose?: () => void;
  onRequestSchedule?: () => void;
}

export function EmergencyBanner({ onClose, onRequestSchedule }: EmergencyBannerProps) {
  const [closestDesk, setClosestDesk] = useState<FrontDesk | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [buildingInput, setBuildingInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;

          // Calculate distances to all front desks
          let closest = FRONT_DESKS[0];
          let minDistance = calculateDistance(
            userLat,
            userLon,
            closest.latitude,
            closest.longitude
          );

          for (let i = 1; i < FRONT_DESKS.length; i++) {
            const desk = FRONT_DESKS[i];
            const dist = calculateDistance(
              userLat,
              userLon,
              desk.latitude,
              desk.longitude
            );
            if (dist < minDistance) {
              minDistance = dist;
              closest = desk;
            }
          }

          setClosestDesk(closest);
          setDistance(minDistance);
        },
        () => {
          // If geolocation fails, default to Hill Community
          setClosestDesk(FRONT_DESKS[0]);
        }
      );
    }
  }, []);

  // Allow user to override by entering a building name (e.g., "Boggs")
  const handleBuildingSubmit = () => {
    const name = buildingInput.trim().toLowerCase();
    if (!name) {
      setFeedback('Please enter a building name');
      return;
    }

    // Check explicit mapping file first
    const mappedDeskName = (BUILDING_MAP as Record<string, string>)[name];
    if (mappedDeskName) {
      const mapped = FRONT_DESKS.find((d) => d.name === mappedDeskName);
      if (mapped) {
        setClosestDesk(mapped);
        setDistance(0);
        setFeedback(`Mapped to ${mapped.name}`);
        setTimeout(() => setFeedback(null), 5000);
        return;
      }
    }

    // Exact match first
    let match = FRONT_DESKS.find((d) => d.buildings.some((b) => b.toLowerCase() === name));
    // Substring match (fuzzy) next
    if (!match) {
      match = FRONT_DESKS.find((d) => d.buildings.some((b) => b.toLowerCase().includes(name)));
    }
    // Word-start match (e.g., "boggs" -> "boggs hall")
    if (!match) {
      match = FRONT_DESKS.find((d) =>
        d.buildings.some((b) => b.toLowerCase().split(/\s|[-]/).some((part) => part === name))
      );
    }

    if (match) {
      setClosestDesk(match);
      setDistance(0);
      setFeedback(`Mapped to ${match.name}`);
    } else {
      setFeedback('No front desk found for that building');
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className="bg-red-700 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Emergency Assistance</h3>
              <p className="text-red-100 mb-3">
                If you are in need of an emergency, please call your local front desk immediately.
              </p>

              {closestDesk && (
                <div className="bg-red-800 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium mb-1">
                        📍 Nearest Front Desk
                      </p>
                      <p className="text-base font-bold">{closestDesk.name}</p>
                      {distance !== null && (
                        <p className="text-xs text-red-100 mt-1">
                          Approximately {distance.toFixed(2)} miles away
                        </p>
                      )}
                    </div>
                    <a href={`tel:${closestDesk.phone}`} className="bg-white text-red-700 px-4 py-2 rounded font-bold hover:bg-red-50 transition-colors whitespace-nowrap ml-2">
                      Call Now
                    </a>
                  </div>

                  {showDetails && (
                    <div className="mt-3 border-t border-red-600 pt-3">
                      <p className="text-sm font-medium mb-1">Serves these buildings:</p>
                      <ul className="text-xs text-red-100 space-y-1">
                        {closestDesk.buildings.map((building) => (
                          <li key={building}>• {building}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                    <div className="mt-3 flex items-center gap-3">
                      <button onClick={() => setShowDetails(!showDetails)} className="text-xs text-red-200 hover:text-white mt-2 underline">
                        {showDetails ? 'Hide' : 'Show'} details
                      </button>

                      <button onClick={() => onRequestSchedule?.()} className="text-xs bg-white text-red-700 px-3 py-1 rounded mt-2 hover:bg-red-50">
                        Need to speak to an RA in person
                      </button>
                    </div>
                </div>
              )}

              {/* Building override input */}
              <div className="mt-3">
                <label className="sr-only">Building name</label>
                <div className="flex items-center gap-2">
                  <input value={buildingInput} onChange={(e) => setBuildingInput(e.target.value)} placeholder="Enter building name (e.g., Boggs)" className="w-full px-3 py-2 rounded bg-red-800 text-white placeholder-red-200 focus:outline-none" />
                  <button onClick={handleBuildingSubmit} className="bg-white text-red-700 px-3 py-2 rounded">Match</button>
                </div>
                {feedback && <p className="text-sm text-red-100 mt-2">{feedback}</p>}
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-red-200 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
