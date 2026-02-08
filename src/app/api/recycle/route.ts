import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

// ── Step 1: Use OpenRouter vision model to identify objects in the image ──
async function identifyObjects(imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  // Try Gemini via OpenRouter first (free vision), fallback to GPT-4o-mini
  const models = ['google/gemini-2.0-flash-exp:free', 'openai/gpt-4o-mini'];
  let lastError = '';

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                {
                  type: 'text',
                  text: 'Identify ONLY the main object being held or presented in this image. Ignore hands, fingers, arms, backgrounds, surfaces, and anything that is not the primary item. Be specific (e.g. "plastic water bottle", "banana peel", "cardboard box"). List only the main item(s), comma-separated, nothing else.',
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        lastError = `${model}: ${res.status} ${await res.text()}`;
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (text) return text;
    } catch (err: any) {
      lastError = `${model}: ${err?.message || err}`;
    }
  }

  throw new Error(`All vision models failed. Last error: ${lastError}`);
}

// ── Step 2: Use OpenRouter (GPT-3.5-turbo) to classify the items ──
async function classifyWithOpenRouter(itemDescription: string): Promise<{
  classification: string;
  labels: string[];
  tips: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a waste classification expert at the University of Georgia. Given a list of objects, classify the overall waste disposal method. Respond ONLY in valid JSON with this exact structure:
{
  "classification": "Recyclable" | "Compostable" | "Landfill (Trash)" | "Mixed — See Tips",
  "labels": ["item1", "item2"],
  "tips": "One concise paragraph with UGA-specific disposal advice."
}
UGA recycling accepts: paper, cardboard, plastic bottles #1-#2, aluminum/steel cans, glass bottles.
UGA composting: food scraps, napkins, paper towels, coffee grounds/filters.
Landfill: styrofoam, chip bags, plastic wrap, straws, contaminated items.
Always mention UGA bins are color coded: blue = recycling, green = compost, black = landfill.`,
        },
        {
          role: 'user',
          content: `Objects identified in photo: ${itemDescription}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON from the response (handle markdown code fences)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      classification: 'Unknown',
      labels: itemDescription.split(',').map((s: string) => s.trim()).filter(Boolean),
      tips: content,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      classification: parsed.classification || 'Unknown',
      labels: parsed.labels || [],
      tips: parsed.tips || '',
    };
  } catch {
    return {
      classification: 'Unknown',
      labels: itemDescription.split(',').map((s: string) => s.trim()).filter(Boolean),
      tips: content,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 10 image checks per minute per IP ──
    const ip = getClientIP(req);
    const { allowed, retryAfterMs } = rateLimit(`recycle:${ip}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    // Reject files over 10MB even after client compression
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Step 1: Vision model identifies what's in the image
    let itemDescription: string;
    try {
      itemDescription = await identifyObjects(base64, mimeType);
    } catch (err: any) {
      console.error('Vision identification error:', err?.message || err);
      return NextResponse.json({ error: 'Could not identify objects. ' + (err?.message || '') }, { status: 500 });
    }

    // Step 2: OpenRouter classifies recycling/compost/trash
    const result = await classifyWithOpenRouter(itemDescription);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Recycle API error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
