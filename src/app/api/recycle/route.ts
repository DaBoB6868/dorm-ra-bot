import { NextRequest, NextResponse } from 'next/server';

// Simple rule-based classifier that maps Vision labels to recyclable/compostable
function ruleEngine(labels: string[]) {
  const lower = labels.map((l) => l.toLowerCase());

  const recyclableKeywords = ['bottle', 'can', 'paper', 'cardboard', 'glass', 'plastic', 'aluminum', 'tin'];
  const compostableKeywords = ['food', 'fruit', 'vegetable', 'apple', 'banana', 'salad', 'leftover', 'coffee', 'tea', 'paper towel', 'napkin'];

  const isRecyclable = lower.some((l) => recyclableKeywords.some((k) => l.includes(k)));
  const isCompostable = lower.some((l) => compostableKeywords.some((k) => l.includes(k)));

  let classification = 'unknown';
  let tips = '';

  if (isRecyclable && !isCompostable) {
    classification = 'recyclable';
    tips = 'Place in recycling bin if clean; rinse liquids. Check local recycling rules.';
  } else if (isCompostable && !isRecyclable) {
    classification = 'compostable';
    tips = 'Place in compost bin or green waste. Remove non-compostable parts like stickers.';
  } else if (isRecyclable && isCompostable) {
    classification = 'possibly both';
    tips = 'Some items (paper) may be recyclable or compostable depending on contamination. Check local rules.';
  } else {
    classification = 'unknown';
    tips = 'No clear match. Consider consulting local waste guidelines.';
  }

  return { classification, tips };
}

async function callVision(imageBuffer: Buffer) {
  try {
    // Try to dynamically import the Vision client; if not installed or credentials missing, throw
    // This avoids hard failing in environments without setup and allows fallback.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ImageAnnotatorClient } = require('@google-cloud/vision');

    const client = new ImageAnnotatorClient();
    const [result] = await client.labelDetection({ image: { content: imageBuffer } });
    const labels = (result.labelAnnotations || []).map((a: any) => a.description || a.mid).filter(Boolean);
    return labels;
  } catch (err) {
    console.warn('Vision client failed or not configured:', err?.message || err);
    // fallback: empty labels
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get labels from Vision (or fallback)
    const labels = await callVision(buffer);

    // If Vision didn't return anything, attempt a naive filename/bytes heuristic
    if (!labels || labels.length === 0) {
      const nameHints = (file.name || '').split(/[^a-zA-Z]+/).filter(Boolean);
      const fallbackLabels = nameHints.length ? nameHints : ['unknown'];
      const { classification, tips } = ruleEngine(fallbackLabels);
      return NextResponse.json({ labels: fallbackLabels, classification, tips });
    }

    const { classification, tips } = ruleEngine(labels);
    return NextResponse.json({ labels, classification, tips });
  } catch (err: any) {
    console.error('Recycle API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
