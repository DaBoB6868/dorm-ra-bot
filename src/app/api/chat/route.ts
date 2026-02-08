import { NextRequest, NextResponse } from 'next/server';
import { generateRAGResponse, generateStreamingRAGResponse } from '@/lib/rag-service';
import { rateLimit } from '@/lib/rate-limit';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  stream?: boolean;
  userLocation?: string;
}

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: 25 requests per minute per IP ──
    const ip = getClientIP(request);
    const { allowed, retryAfterMs } = rateLimit(ip, 25, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const body = (await request.json()) as ChatRequest;
    const { message, conversationHistory = [], stream = false, userLocation } = body;

    // ── Input validation ──
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` }, { status: 400 });
    }
    // Truncate history to prevent context stuffing
    const safeHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);

    if (stream) {
      // Implement streaming response
      const responseStream = await generateStreamingRAGResponse(
        message,
        safeHistory,
        userLocation,
      );

      const encoder = new TextEncoder();

      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const token of responseStream) {
              const chunk = typeof token === 'string' ? token : (token as any)?.content || '';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const { response, sources } = await generateRAGResponse(
        message,
        safeHistory,
        userLocation,
      );

      return NextResponse.json({
        response,
        sources,
        message: 'Response generated successfully',
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
