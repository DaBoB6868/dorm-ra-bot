import { NextResponse } from 'next/server';

export interface UGAEvent {
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

function extractTag(xml: string, tag: string, ns?: string): string {
  // Handle namespaced tags like <start xmlns="events">
  const patterns = ns
    ? [
        new RegExp(`<${tag}\\s+xmlns="${ns}"[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
        new RegExp(`<${ns}:${tag}[^>]*>([\\s\\S]*?)</${ns}:${tag}>`, 'i'),
      ]
    : [new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function extractAllTags(xml: string, tag: string, ns?: string): string[] {
  const results: string[] = [];
  const patterns = ns
    ? [
        new RegExp(`<${tag}\\s+xmlns="${ns}"[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'),
        new RegExp(`<${ns}:${tag}[^>]*>([\\s\\S]*?)</${ns}:${tag}>`, 'gi'),
      ]
    : [new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      results.push(match[1].trim());
    }
  }
  return results;
}

function extractEnclosureUrl(xml: string): string {
  const match = xml.match(/<enclosure\s+url="([^"]+)"/i);
  return match ? match[1] : '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  try {
    const rssUrl = 'https://uga.campuslabs.com/engage/events.rss';
    const response = await fetch(rssUrl, {
      next: { revalidate: 300 }, // cache for 5 minutes
      headers: {
        'User-Agent': 'UGA-RA-Bot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();

    // Split into items
    const items = xml.split('<item>').slice(1); // remove header

    const now = new Date();
    const events: UGAEvent[] = [];

    for (const itemXml of items) {
      const title = extractTag(itemXml, 'title')
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        .trim();
      const link = extractTag(itemXml, 'link') || extractTag(itemXml, 'guid');
      const imageUrl = extractEnclosureUrl(itemXml);
      const rawDescription = extractTag(itemXml, 'description');
      const description = stripHtml(rawDescription).slice(0, 200);
      const categories = extractAllTags(itemXml, 'category');
      const category = categories.length > 0 ? categories[0] : 'General';
      const startStr = extractTag(itemXml, 'start', 'events');
      const endStr = extractTag(itemXml, 'end', 'events');
      const location = extractTag(itemXml, 'location', 'events');
      const status = extractTag(itemXml, 'status', 'events');
      const hosts = extractAllTags(itemXml, 'host', 'events');
      const host = hosts.join(', ');

      // Skip cancelled events
      if (status === 'cancelled') continue;

      // Only include events that haven't ended yet
      const endDate = new Date(endStr);
      if (endDate < now) continue;

      if (title && startStr) {
        events.push({
          title,
          link,
          imageUrl: imageUrl || undefined,
          description,
          category,
          startDate: startStr,
          endDate: endStr,
          location,
          status,
          host,
        });
      }
    }

    // Sort by start date
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Return up to 50 events (limit for performance)
    return NextResponse.json({
      events: events.slice(0, 50),
      total: events.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', events: [] },
      { status: 500 }
    );
  }
}
