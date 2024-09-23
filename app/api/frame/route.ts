import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { runCliCommand } from '@/app/services/cli';
import * as fs from 'fs/promises';
import path from 'path';

interface RequestData {
  prompt: string;
  status: 'processing' | 'completed' | 'error';
}

const requestStore: { [key: string]: RequestData } = {};

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get("action") || "input";
  const requestId = searchParams.get("id");
  const data = await req.json();
  const prompt = data.untrustedData?.inputText;

  switch (action) {
    case "input":
      return new NextResponse(`<!DOCTYPE html><html><head>
        <title>Input Prompt</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/enter-prompt.png" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/enter-prompt.png" />
        <meta property="fc:frame:button:1" content="Submit" />
        <meta property="fc:frame:input:text" content="Enter your prompt" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=submit" />
      </head></html>`);

    case "submit":
      if (prompt) {
        const id = uuidv4();
        requestStore[id] = { prompt, status: 'processing' };

        // Start the image generation process asynchronously
        generateImage(id, prompt);

        // Immediately return the loading state
        return new NextResponse(`<!DOCTYPE html><html><head>
          <title>Request Submitted</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/loading.gif" />
          <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/loading.gif" />
          <meta property="fc:frame:button:1" content="Check Status" />
          <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=check&id=${id}" />
        </head></html>`);
      }
      break;

    case "check":
      if (requestId && requestId in requestStore) {
        const request = requestStore[requestId];
        switch (request.status) {
          case 'completed':
            const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/result.png`;
            return new NextResponse(`<!DOCTYPE html><html><head>
              <title>Result</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="og:image" content="${imageUrl}" />
              <meta property="fc:frame:image" content="${imageUrl}" />
              <meta property="fc:frame:button:1" content="New Request" />
              <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=input" />
            </head></html>`);
          case 'error':
            return new NextResponse(`<!DOCTYPE html><html><head>
              <title>Error</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/error.png" />
              <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/error.png" />
              <meta property="fc:frame:button:1" content="Try Again" />
              <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=input" />
            </head></html>`);
          case 'processing':
            return new NextResponse(`<!DOCTYPE html><html><head>
              <title>Processing</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/loading.gif" />
              <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/loading.gif" />
              <meta property="fc:frame:button:1" content="Check Again" />
              <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=check&id=${requestId}" />
            </head></html>`);
        }
      }
      break;
  }

  // Fallback response
  return new NextResponse(`<!DOCTYPE html><html><head>
    <title>Error</title>
    <meta property="fc:frame" content="vNext" />
    <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/error.png" />
    <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/error.png" />
    <meta property="fc:frame:button:1" content="Start Over" />
    <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=input" />
  </head></html>`);
}

async function generateImage(id: string, prompt: string) {
  try {
    const imageBuffer: any = await runCliCommand(prompt);
    const imagePath = path.join(process.cwd(), 'public', 'result.png');
    await fs.writeFile(imagePath, imageBuffer);
    requestStore[id] = { prompt, status: 'completed' };
  } catch (error) {
    console.error('Error generating image:', error);
    requestStore[id] = { prompt, status: 'error' };
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = 'force-dynamic';