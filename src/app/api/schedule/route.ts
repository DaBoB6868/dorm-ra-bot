import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedules.json');

async function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SCHEDULE_FILE)) {
      fs.writeFileSync(SCHEDULE_FILE, JSON.stringify([]));
    }
  } catch (e) {
    console.error('Failed to ensure data file:', e);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await ensureDataFile();

    const raw = fs.readFileSync(SCHEDULE_FILE, 'utf-8');
    const arr = JSON.parse(raw || '[]');

    const entry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...body,
    };

    arr.push(entry);
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(arr, null, 2));

    console.log('Persisted schedule request:', entry);

    // If a webhook is configured, POST the entry
    const webhook = process.env.WEBHOOK_URL;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch (e) {
        console.error('Failed to send webhook:', e);
      }
    }

    return NextResponse.json({ ok: true, message: 'Request saved', id: entry.id });
  } catch (err) {
    console.error('Schedule POST error:', err);
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}
