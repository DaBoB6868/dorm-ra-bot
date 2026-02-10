import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import fs from 'fs';
import path from 'path';
import { vectorStore } from './vector-store';
import { initializeDocuments } from './initialize-documents';

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'openai/gpt-3.5-turbo',
  temperature: 0.2,
  configuration: {
    baseURL: 'https://openrouter.ai/api/v1',
  },
});

// ══════════════════════════════════════════════════════════════
// Load ALL JSON knowledge bases once, keyed by their document_id
// ══════════════════════════════════════════════════════════════
const JSONS_DIR = path.join(process.cwd(), 'backend', 'jsons');

interface PolicyDoc {
  id: string;        // filename (without .json)
  title: string;
  data: Record<string, unknown>;
}

let policyDocs: PolicyDoc[] | null = null;
let pdfInitPromise: Promise<void> | null = null;

function loadAllPolicies(): PolicyDoc[] {
  if (policyDocs) return policyDocs;
  policyDocs = [];

  if (!fs.existsSync(JSONS_DIR)) return policyDocs;

  const files = fs.readdirSync(JSONS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(JSONS_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      policyDocs.push({
        id: file.replace('.json', ''),
        title: data.title || file,
        data,
      });
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
    }
  }
  console.log(`📚 Loaded ${policyDocs.length} policy documents: ${policyDocs.map((d) => d.id).join(', ')}`);
  return policyDocs;
}

// ── Community guide (still gets special keyword routing) ──
function getCommunityGuide(): Record<string, unknown> {
  const docs = loadAllPolicies();
  const cg = docs.find((d) => d.id === 'community_guide');
  return cg?.data ?? {};
}

async function ensurePdfInitialized(): Promise<void> {
  if (vectorStore.getAllDocuments().length > 0) return;
  if (!pdfInitPromise) {
    pdfInitPromise = initializeDocuments();
  }
  await pdfInitPromise;
}

async function getPdfContext(query: string): Promise<{ context: string; sources: string[] }> {
  await ensurePdfInitialized();

  const results = await vectorStore.searchWithScores(query, 8);
  const filtered = results.filter((item) => item.score >= 0.08);

  const pickContext = (docs: Array<{ content: string; metadata: { source: string; pageNumber?: number } }>) => {
    const context = docs
      .map((doc) => {
        const page = doc.metadata.pageNumber ? ` p. ${doc.metadata.pageNumber}` : '';
        return `[${doc.metadata.source}${page}]
${doc.content}`;
      })
      .join('\n\n');

    const sources = Array.from(
      new Set(
        docs.map((doc) => {
          const page = doc.metadata.pageNumber ? ` p. ${doc.metadata.pageNumber}` : '';
          return `${doc.metadata.source}${page}`;
        })
      )
    );

    return { context, sources };
  };

  if (filtered.length > 0) {
    return pickContext(filtered.map((item) => item.doc));
  }

  const keywords = Array.from(
    new Set((query.toLowerCase().match(/[a-z0-9]{3,}/g) || []))
  );
  const keywordMatches = vectorStore
    .getAllDocuments()
    .filter((doc) => keywords.some((word) => doc.content.toLowerCase().includes(word)));

  if (keywordMatches.length > 0) {
    return pickContext(keywordMatches.slice(0, 6));
  }

  return { context: '', sources: [] };
}

// Flatten JSON into readable text sections the LLM can consume
function flattenJson(obj: unknown, prefix = ''): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return `${prefix}: ${obj}`;
  }
  if (Array.isArray(obj)) {
    if (obj.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return `${prefix}: ${obj.join(', ')}`;
    }
    return obj.map((item, i) => flattenJson(item, `${prefix}[${i}]`)).join('\n');
  }
  if (typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>)
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ');
        const newPrefix = prefix ? `${prefix} > ${label}` : label;
        return flattenJson(value, newPrefix);
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

// Extract sections relevant to the user's query by keyword matching
function getRelevantSections(query: string): string {
  const guide = getCommunityGuide();
  const queryLower = query.toLowerCase();

  // ── Which additional policy documents should we include? ──
  // Maps keywords → document IDs (filenames without .json)
  const policyKeywordMap: Record<string, string[]> = {
    'academic honesty': ['academic_honesty_policy'],
    'cheating': ['academic_honesty_policy'],
    'plagiarism': ['academic_honesty_policy'],
    'honor code': ['academic_honesty_policy'],
    'academic integrity': ['academic_honesty_policy'],
    'academic dishonesty': ['academic_honesty_policy'],
    'code of conduct': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'student conduct': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'disciplin': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'sanction': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'judiciary': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'hearing': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'violation': ['code_of_conduct_part1', 'code_of_conduct_part2', 'code_of_conduct_part3'],
    'computer use': ['computer_use_policy'],
    'acceptable use': ['computer_use_policy'],
    'network': ['computer_use_policy'],
    'hacking': ['computer_use_policy'],
    'copyright': ['computer_use_policy'],
    'download': ['computer_use_policy'],
    'piracy': ['computer_use_policy'],
    'minor': ['minors_policy'],
    'child': ['minors_policy'],
    'youth program': ['minors_policy'],
    'camp': ['minors_policy'],
    'discrimination': ['ndah_policy'],
    'harassment': ['ndah_policy'],
    'title ix': ['ndah_policy'],
    'sexual misconduct': ['ndah_policy'],
    'equal opportunity': ['ndah_policy'],
    'bias': ['ndah_policy'],
    'retaliation': ['ndah_policy'],
    'protected class': ['ndah_policy'],
    'reporting': ['ndah_policy'],
  };

  // Determine which extra policy docs to pull in
  const matchedDocIds = new Set<string>();
  for (const [keyword, docIds] of Object.entries(policyKeywordMap)) {
    if (queryLower.includes(keyword)) {
      docIds.forEach((id) => matchedDocIds.add(id));
    }
  }

  // Flatten matched policy docs into context text (cap each at ~3000 chars)
  const MAX_PER_DOC = 3000;
  const allDocs = loadAllPolicies();
  const policyContextParts: string[] = [];
  for (const docId of matchedDocIds) {
    const doc = allDocs.find((d) => d.id === docId);
    if (doc) {
      let text = `[${doc.title}]\n${flattenJson(doc.data, '')}`;
      if (text.length > MAX_PER_DOC) text = text.slice(0, MAX_PER_DOC) + '\n…(truncated)';
      policyContextParts.push(text);
    }
  }

  // ── Community guide keyword routing (unchanged) ──

  // Map common question keywords to JSON top-level keys
  const keywordMap: Record<string, string[]> = {
    'quiet hours': ['policies.noise_courtesy_and_quiet_hours'],
    'noise': ['policies.noise_courtesy_and_quiet_hours'],
    'courtesy hours': ['policies.noise_courtesy_and_quiet_hours'],
    'guest': ['policies.visitation'],
    'visitor': ['policies.visitation'],
    'visitation': ['policies.visitation'],
    'overnight': ['policies.visitation'],
    'alcohol': ['policies.alcohol_and_other_drugs'],
    'drug': ['policies.alcohol_and_other_drugs'],
    'pet': ['policies.pets', 'services_for_students_with_disabilities.emotional_support_animals', 'services_for_students_with_disabilities.service_animals'],
    'animal': ['policies.pets', 'services_for_students_with_disabilities.emotional_support_animals', 'services_for_students_with_disabilities.service_animals'],
    'fire': ['policies.fire_safety', 'fire_evacuation_and_severe_weather_shelter'],
    'evacuation': ['fire_evacuation_and_severe_weather_shelter'],
    'tornado': ['general_information.tornado_warning', 'general_information.tornado_watch'],
    'weapon': ['policies.firearms_weapons_and_explosives'],
    'gun': ['policies.firearms_weapons_and_explosives'],
    'knife': ['policies.firearms_weapons_and_explosives'],
    'appliance': ['policies.appliances_and_electronic_devices'],
    'microwave': ['policies.appliances_and_electronic_devices'],
    'fridge': ['policies.appliances_and_electronic_devices'],
    'refrigerator': ['policies.appliances_and_electronic_devices'],
    'iron': ['policies.appliances_and_electronic_devices'],
    'ironing': ['policies.appliances_and_electronic_devices'],
    'cooking': ['policies.cooking_guidelines'],
    'cook': ['policies.cooking_guidelines'],
    'kitchen': ['policies.cooking_guidelines'],
    'decoration': ['policies.decorations'],
    'poster': ['policies.decorations'],
    'candle': ['policies.decorations', 'policies.fire_safety'],
    'key': ['policies.lock_security'],
    'lock': ['policies.lock_security'],
    'lockout': ['policies.lock_security'],
    'bike': ['policies.bicycles_and_transportation_devices'],
    'scooter': ['policies.bicycles_and_transportation_devices'],
    'parking': ['policies.bicycles_and_transportation_devices'],
    'smoke': ['policies.smoking'],
    'tobacco': ['policies.smoking'],
    'vape': ['policies.smoking'],
    'mail': ['general_information.mail_and_packages'],
    'package': ['general_information.mail_and_packages'],
    'laundry': ['general_information.laundry_facilities'],
    'wifi': ['general_information.internet_connectivity'],
    'internet': ['general_information.internet_connectivity'],
    'ethernet': ['general_information.internet_connectivity'],
    'maintenance': ['general_information.work_requests'],
    'work request': ['general_information.work_requests'],
    'repair': ['general_information.work_requests'],
    'recycl': ['policies.recycling_and_trash'],
    'trash': ['policies.recycling_and_trash'],
    'compost': ['policies.recycling_and_trash'],
    'conduct': ['student_conduct'],
    'roommate': ['community_living_standards'],
    'room change': ['policies.room_apartment_entry'],
    'furniture': ['policies.room_apartment_furnishings'],
    'bed': ['policies.lofts', 'policies.room_apartment_furnishings'],
    'loft': ['policies.lofts'],
    'damage': ['policies.vandalism_and_damages'],
    'vandal': ['policies.vandalism_and_damages'],
    'insurance': ['general_information.responsibility_for_student_property'],
    'staff': ['housing_staff'],
    'ra ': ['housing_staff.resident_assistants'],
    'phone': ['important_phone_numbers'],
    'number': ['important_phone_numbers'],
    'contact': ['important_phone_numbers'],
    'front desk': ['important_phone_numbers.community_offices', 'general_information.community_desk'],
    'summer': ['summer_housing'],
    'disability': ['services_for_students_with_disabilities'],
    'accommodation': ['services_for_students_with_disabilities'],
    'health check': ['general_information.health_and_safety_checks'],
    'inspection': ['general_information.health_and_safety_checks'],
    'camera': ['general_information.cameras'],
    'emergency': ['general_information.uga_alert', 'important_phone_numbers.safety_numbers'],
    'uga alert': ['general_information.uga_alert'],
    'solicitation': ['policies.solicitation_and_fundraising'],
    'window': ['policies.windows_and_screens'],
    'screen': ['policies.windows_and_screens'],
    'oil diffuser': ['policies.essential_oil_diffusers'],
    'diffuser': ['policies.essential_oil_diffusers'],
    'contract': ['contract_review_process'],
    'appeal': ['contract_review_process.review_appeal'],
    'community council': ['community_activities.community_councils'],
    'rha': ['community_activities.residence_hall_association'],
    'event': ['community_activities'],
    'census': ['policies.us_census_surveys'],
    'access': ['policies.access_control'],
    'ugacard': ['policies.access_control'],
    'buzzcard': ['policies.access_control'],
  };

  // Find matching sections
  const matchedPaths = new Set<string>();
  for (const [keyword, paths] of Object.entries(keywordMap)) {
    if (queryLower.includes(keyword)) {
      paths.forEach((p) => matchedPaths.add(p));
    }
  }

  // If no specific match, include general policies + phone numbers as fallback
  if (matchedPaths.size === 0) {
    matchedPaths.add('policies');
    matchedPaths.add('general_information');
  }

  // Resolve dot-path keys from the guide
  const sections: string[] = [];
  for (const dotPath of matchedPaths) {
    const keys = dotPath.split('.');
    let current: unknown = guide;
    for (const key of keys) {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        current = undefined;
        break;
      }
    }
    if (current !== undefined) {
      sections.push(flattenJson(current, dotPath.replace(/\./g, ' > ')));
    }
  }

  // Also always include phone numbers for the student's building if we can find it
  const allParts = [...policyContextParts, ...sections].filter(Boolean);
  return allParts.join('\n\n');
}

// ══════════════════════════════════════════════════════════════
// Building → Community mapping using building-mappings.json
// (accurate community data: front desk, phone, policies, etc.)
// ══════════════════════════════════════════════════════════════
import buildingMappings from './building-mappings.json';

interface CommunityInfo {
  buildings: string[];
  frontDesk: string;
  frontDeskLocation: string;
  frontDeskPhone: string;
  quietHours: string;
  courtesyHours: string;
  laundry: string;
  diningNearby: string[];
  mailroom: string;
  parking: string;
  roomType: string;
  amenities: string[];
  policies: Record<string, string>;
}

function getBuildingCommunityInfo(userLocation: string): string {
  if (!userLocation) return '';

  const loc = userLocation.toLowerCase().trim();
  const lookup = (buildingMappings as any).buildingLookup as Record<string, string>;
  const communities = (buildingMappings as any).communities as Record<string, CommunityInfo>;

  // Find which community this building belongs to
  const communityName = lookup[loc];
  if (!communityName || !communities[communityName]) {
    // Fallback: try partial match
    const key = Object.keys(lookup).find((k) => loc.includes(k) || k.includes(loc));
    if (!key) return '';
    const fallbackCommunity = lookup[key];
    if (!fallbackCommunity || !communities[fallbackCommunity]) return '';
    return formatCommunityInfo(userLocation, fallbackCommunity, communities[fallbackCommunity]);
  }

  return formatCommunityInfo(userLocation, communityName, communities[communityName]);
}

function formatCommunityInfo(building: string, communityName: string, info: CommunityInfo): string {
  // Also grab building-specific phone info from community_guide JSON
  const guide = getCommunityGuide();
  const offices = (guide as any)?.important_phone_numbers?.community_offices;
  let buildingPhone = '';
  if (Array.isArray(offices)) {
    const bLoc = building.toLowerCase().trim();
    const match = offices.find((o: any) =>
      o.building?.toLowerCase().includes(bLoc) || bLoc.includes(o.building?.toLowerCase())
    );
    if (match) {
      const parts: string[] = [];
      if (match.front_desk) parts.push(`Building Front Desk: ${match.front_desk}${match.front_desk_location ? ` (at ${match.front_desk_location})` : ''}`);
      if (match.community_office) parts.push(`Community Office: ${match.community_office}${match.community_office_location ? ` (at ${match.community_office_location})` : ''}`);
      if (match.ra_on_call) parts.push(`RA On-Call: ${match.ra_on_call}`);
      buildingPhone = parts.join('\n');
    }
  }

  const lines = [
    `=== ${building.toUpperCase()} — ${communityName} ===`,
    `Community: ${communityName}`,
    `Buildings in this community: ${info.buildings.join(', ')}`,
    `Front Desk: ${info.frontDesk} at ${info.frontDeskLocation}`,
    `Front Desk Phone: ${info.frontDeskPhone}`,
    buildingPhone ? `\n${buildingPhone}` : '',
    `Quiet Hours: ${info.quietHours}`,
    `Courtesy Hours: ${info.courtesyHours}`,
    `Laundry: ${info.laundry}`,
    `Dining Nearby: ${info.diningNearby.join(', ')}`,
    `Mail/Packages: ${info.mailroom}`,
    `Parking: ${info.parking}`,
    `Room Type: ${info.roomType}`,
    `Amenities: ${info.amenities.join(', ')}`,
    '',
    'Community Policies:',
    ...Object.entries(info.policies).map(([key, val]) => `  ${key}: ${val}`),
  ];

  return lines.filter((l) => l !== '').join('\n');
}

// Legacy function kept for compatibility
function getBuildingPhoneInfo(userLocation: string): string {
  return getBuildingCommunityInfo(userLocation);
}

// ══════════════════════════════════════════════════════════════
// Walking directions lookup
// ══════════════════════════════════════════════════════════════
const WALKING_DIR_PATH = path.join(process.cwd(), 'backend', 'data', 'walking-directions.json');
let walkingData: Record<string, unknown> | null = null;

function loadWalkingDirections(): Record<string, unknown> {
  if (walkingData) return walkingData;
  try {
    if (fs.existsSync(WALKING_DIR_PATH)) {
      walkingData = JSON.parse(fs.readFileSync(WALKING_DIR_PATH, 'utf-8'));
      console.log('🗺️  Loaded walking directions data');
    }
  } catch (err) {
    console.error('Failed to load walking directions:', err);
  }
  return walkingData ?? {};
}

function isDirectionsQuery(query: string): boolean {
  const dirKeywords = [
    'how do i get to', 'how to get to', 'walk to', 'walking to',
    'directions to', 'direction to', 'where is', 'where\'s',
    'how far', 'how long to walk', 'how to find', 'how do i find',
    'take me to', 'navigate to', 'get to the', 'way to',
    'walk from', 'walking from', 'route to', 'path to',
    'closest', 'nearest', 'how close',
  ];
  const q = query.toLowerCase();
  return dirKeywords.some((kw) => q.includes(kw));
}

function getWalkingDirections(query: string, userLocation: string): string {
  if (!userLocation) return '';
  const data = loadWalkingDirections();
  const communityDirs = data.communityDirections as Record<string, any> | undefined;
  const destinations = data.campusDestinations as Record<string, any> | undefined;
  const busInfo = data.ugaBusInfo as Record<string, any> | undefined;
  const safetyTips = data.safetyTips as Record<string, any> | undefined;
  if (!communityDirs) return '';

  // Step 1: Resolve user's building to a community
  const loc = userLocation.toLowerCase().trim();
  const lookup = (buildingMappings as any).buildingLookup as Record<string, string>;
  let communityName = lookup[loc];
  if (!communityName) {
    const key = Object.keys(lookup).find((k) => loc.includes(k) || k.includes(loc));
    if (key) communityName = lookup[key];
  }
  if (!communityName) return '';

  const community = communityDirs[communityName];
  if (!community) return '';

  const queryLower = query.toLowerCase();
  const directions = community.directions as Record<string, any>;

  // Step 2: Find requested destination in the query
  const destNames = Object.keys(directions);
  let matchedDest: string | null = null;
  let bestLen = 0;

  // Also check aliases from campusDestinations
  for (const dest of destNames) {
    const destLower = dest.toLowerCase();
    // Check main name
    if (queryLower.includes(destLower) && destLower.length > bestLen) {
      matchedDest = dest;
      bestLen = destLower.length;
    }
    // Check partial keywords in destination name
    const words = destLower.split(/[\s()]+/).filter((w) => w.length > 3);
    for (const word of words) {
      if (queryLower.includes(word) && !['hall', 'the', 'street'].includes(word)) {
        if (!matchedDest || destLower.length > bestLen) {
          matchedDest = dest;
          bestLen = destLower.length;
        }
      }
    }
  }

  // Also try common aliases
  const aliasMap: Record<string, string> = {
    'rec center': 'Ramsey Student Center', 'rec': 'Ramsey Student Center', 'gym': 'Ramsey Student Center',
    'ramsey': 'Ramsey Student Center', 'workout': 'Ramsey Student Center', 'fitness': 'Ramsey Student Center',
    'mlc': 'Miller Learning Center (MLC)', 'miller': 'Miller Learning Center (MLC)',
    'tate': 'Tate Student Center', 'student center': 'Tate Student Center',
    'chick-fil-a': 'Tate Student Center', 'chick fil a': 'Tate Student Center', 'cfa': 'Tate Student Center',
    'panda express': 'Tate Student Center', 'starbucks': 'Tate Student Center',
    'bookstore': 'UGA Bookstore', 'book store': 'UGA Bookstore',
    'stadium': 'Sanford Stadium', 'sanford': 'Sanford Stadium', 'football': 'Sanford Stadium',
    'arch': 'The Arch', 'the arch': 'The Arch',
    'library': 'Main Library', 'main library': 'Main Library',
    'science library': 'Science Library',
    'bolton': 'Bolton Dining Commons', 'snelling': 'Snelling Dining Commons',
    'niche': 'The Niche', 'the niche': 'The Niche',
    'o-house': 'Oglethorpe Dining Commons', 'o house': 'Oglethorpe Dining Commons',
    'village summit': 'Village Summit Dining',
    'health center': 'University Health Center', 'health': 'University Health Center',
    'doctor': 'University Health Center', 'clinic': 'University Health Center',
    'stegeman': 'Stegeman Coliseum', 'basketball': 'Stegeman Coliseum', 'gymnastics': 'Stegeman Coliseum',
    'coliseum': 'Stegeman Coliseum',
    'five points': 'Five Points',
    'downtown': 'Downtown Athens (Broad Street)', 'broad street': 'Downtown Athens (Broad Street)',
    'bars': 'Downtown Athens (Broad Street)', 'restaurants downtown': 'Downtown Athens (Broad Street)',
    'terry': 'Terry College of Business', 'business school': 'Terry College of Business',
    'grady': 'Grady College of Journalism', 'journalism': 'Grady College of Journalism',
    'park hall': 'Park Hall', 'aderhold': 'Aderhold Hall',
    'chemistry': 'Chemistry Building', 'chem': 'Chemistry Building',
    'pharmacy': 'Pharmacy Building',
    'engineering': 'Engineering Complex', 'driftmier': 'Engineering Complex',
    'founders garden': 'Founders Memorial Garden', 'garden': 'Founders Memorial Garden',
    'museum': 'Georgia Museum of Art', 'art museum': 'Georgia Museum of Art',
    'performing arts': 'Performing Arts Center', 'concert': 'Performing Arts Center', 'hodgson': 'Performing Arts Center',
    'pool': 'Legion Pool', 'swimming': 'Legion Pool', 'legion': 'Legion Pool',
    'intramural': 'Intramural Fields', 'im fields': 'Intramural Fields',
    'bus': 'UGA Transit Hub (East Campus)', 'bus stop': 'UGA Transit Hub (East Campus)',
    'transit': 'UGA Transit Hub (East Campus)',
    'parking': 'East Campus Deck (Parking)', 'park my car': 'East Campus Deck (Parking)',
    'slc': 'Student Learning Center (SLC)', 'science learning': 'Student Learning Center (SLC)',
    'police': 'UGA Police Department',
    'memorial hall': 'Memorial Hall',
    'north campus': 'North Campus Quad', 'quad': 'North Campus Quad',
    'boyd': 'Boyd GSRC', 'gsrc': 'Boyd GSRC',
    'coverdell': 'Coverdell Center',
  };

  if (!matchedDest) {
    for (const [alias, dest] of Object.entries(aliasMap)) {
      if (queryLower.includes(alias) && directions[dest]) {
        matchedDest = dest;
        break;
      }
    }
  }

  // Step 3: Build response
  const parts: string[] = [];

  if (matchedDest && directions[matchedDest]) {
    const dir = directions[matchedDest];
    parts.push(`=== Walking Directions: ${userLocation} → ${matchedDest} ===`);
    parts.push(`Distance: ${dir.distance}`);
    parts.push(`Estimated walk time: ${dir.time}`);
    parts.push(`Directions: ${dir.directions}`);
    if (dir.landmarks?.length) parts.push(`Key landmarks: ${dir.landmarks.join(', ')}`);

    // Add destination details if available
    if (destinations && destinations[matchedDest] && !(destinations[matchedDest] as any).alias) {
      const dest = destinations[matchedDest] as any;
      if (dest.address) parts.push(`Address: ${dest.address}`);
      if (dest.hours) parts.push(`Hours: ${dest.hours}`);
      if (dest.description) parts.push(`About: ${dest.description}`);
    }
  } else if (isDirectionsQuery(query)) {
    // No specific destination matched — provide all available destinations
    parts.push(`=== Available Destinations from ${userLocation} (${communityName}) ===`);
    parts.push('Here are places I can give you walking directions to:\n');
    for (const [dest, info] of Object.entries(directions)) {
      const d = info as any;
      parts.push(`• ${dest} — ${d.distance}, ~${d.time} walk`);
    }
  }

  // Add bus info for longer walks or general direction queries
  if (busInfo && (isDirectionsQuery(query) || queryLower.includes('bus'))) {
    parts.push('\n=== UGA Bus Info ===');
    parts.push(`Website: ${busInfo.website}`);
    parts.push(`App: ${busInfo.app}`);
    if (busInfo.tips) {
      parts.push('Tips: ' + (busInfo.tips as string[]).join('; '));
    }
  }

  // Add safety tips for night walking queries
  if (safetyTips && (queryLower.includes('night') || queryLower.includes('dark') || queryLower.includes('safe') || queryLower.includes('escort'))) {
    parts.push('\n=== Walking Safety Tips ===');
    parts.push((safetyTips.walkingAtNight as string[]).join('\n'));
    parts.push(`Blue light phones: ${safetyTips.blueEmergencyPhones}`);
    parts.push(`Safety escort: ${safetyTips.safeEscort}`);
  }

  return parts.join('\n');
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateRAGResponse(
  userQuery: string,
  conversationHistory: Message[] = [],
  userLocation?: string,
): Promise<{ response: string; sources: string[] }> {
  try {
    // 1. JSON keyword routing – structured, reliable for known topics
    const jsonContext = getRelevantSections(userQuery);

    // 2. PDF vector search – covers everything the JSON doesn't
    const { context: pdfContext, sources: pdfSources } = await getPdfContext(userQuery);

    // 3. Building community info (front desk, policies, etc.)
    const buildingInfo = userLocation ? getBuildingPhoneInfo(userLocation) : '';

    // 4. Walking directions (if question is about directions/locations)
    const walkingInfo = getWalkingDirections(userQuery, userLocation || '');

    // Build the system prompt
    const locationContext = userLocation
      ? `\nThe student lives in ${userLocation}. Tailor your answers to their specific dorm when the community guide has building-specific info (phone numbers, evacuation procedures, etc.).`
      : `\nThe student has NOT specified which dorm they live in. If they ask a question that depends on their specific dorm or community (e.g. quiet hours, front desk phone, evacuation location, RA on-call number, or walking directions), you MUST ask them which dorm or residence hall they live in FIRST before answering. Say something like "Which dorm do you live in? That way I can give you the exact info for your building!" Do NOT guess or give a generic answer for dorm-specific questions.`;

    const systemPrompt = `You are AURA (AI-powered University Resident Assistant), a friendly and knowledgeable UGA (University of Georgia) dorm assistant. You help UGA students with questions about UGA dorm policies, UGA Housing community guidelines, campus resources, walking directions, and residential life.
  ${locationContext}

  IMPORTANT: Use ONLY the UGA policy excerpts and data provided below to answer questions accurately.
  If a specific item is not mentioned in the excerpts, say you could not find it in the policies. Do NOT assume it is allowed or prohibited.

  For WALKING DIRECTIONS: When direction data is provided, give the student clear step-by-step walking directions. Include the distance, estimated time, and key landmarks. If the walk is long (15+ minutes), mention the UGA bus as an option. Be encouraging and friendly about it.

  Quote specific policies, numbers, rules, and details. Do NOT make up information or infer beyond the provided data. If the data doesn't cover something, say you couldn't find it in the policies and suggest contacting UGA Housing at 706-542-1421 or housing@uga.edu.

  Be friendly, supportive, and professional. Keep responses concise and helpful. Go Dawgs!`;

    // Convert conversation history to LangChain messages
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(systemPrompt),
    ];

    for (const msg of conversationHistory) {
      messages.push(
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      );
    }

    const contextBlock = [jsonContext, pdfContext, buildingInfo, walkingInfo].filter(Boolean).join('\n\n');
    messages.push(
      new HumanMessage(
        `Question: "${userQuery}"\n\nUGA Policy Information:\n${contextBlock || 'No matching policy section found for this question.'}`
      )
    );

    const result = await chatModel.invoke(messages);
    const response = result.content.toString();

    const sources: string[] = [
      ...(jsonContext ? ['UGA Community Guide (JSON)'] : []),
      ...pdfSources,
      ...(walkingInfo ? ['Walking Directions Data'] : []),
    ];

    return {
      response,
      sources,
    };
  } catch (error) {
    console.error('Error generating RAG response:', error);
    throw error;
  }
}

export async function generateStreamingRAGResponse(
  userQuery: string,
  conversationHistory: Message[] = [],
  userLocation?: string,
) {
  // 1. JSON keyword routing – structured, reliable
  const jsonContext = getRelevantSections(userQuery);

  // 2. PDF vector search – fills gaps
  const { context: pdfContext } = await getPdfContext(userQuery);
  const buildingInfo = userLocation ? getBuildingPhoneInfo(userLocation) : '';

  // 3. Walking directions
  const walkingInfo = getWalkingDirections(userQuery, userLocation || '');

  const locationContext = userLocation
    ? `\nThe student lives in ${userLocation}. Tailor answers to their dorm when possible.`
    : `\nThe student has NOT told you their dorm. If the question is dorm-specific (including walking directions), ask which dorm they live in first.`;

  const systemPrompt = `You are AURA (AI-powered University Resident Assistant), a friendly UGA dorm assistant. Use ONLY the UGA policy excerpts and data below to answer accurately. Do NOT make up info or infer beyond the provided data.
For WALKING DIRECTIONS: Give clear step-by-step directions with distance, time, and landmarks. Mention the UGA bus for long walks.
${locationContext}
Be concise and helpful. Go Dawgs!`;

  const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
    new SystemMessage(systemPrompt),
  ];

  for (const msg of conversationHistory) {
    messages.push(
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );
  }

  const contextBlock = [jsonContext, pdfContext, buildingInfo, walkingInfo].filter(Boolean).join('\n\n');
  messages.push(
    new HumanMessage(
      `Question: "${userQuery}"\n\nUGA Policy Information:\n${contextBlock || 'No matching policy section found for this question.'}`
    )
  );

  return chatModel.stream(messages);
}
