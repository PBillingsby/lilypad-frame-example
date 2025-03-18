import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { runCliCommand } from "@/app/services/cli";
import * as fs from "fs/promises";
import path from "path";

interface RequestData {
  prompt: string;
  status: "processing" | "completed" | "error";
}

// ❌ Global mutable object without expiration (memory leak risk)
const requestStore: { [key: string]: RequestData } = {};

async function getResponse(req: NextRequest): Promise<NextResponse> {
  var searchParams = req.nextUrl.searchParams; // ❌ Using `var` instead of `const`/`let`
  var action = searchParams.get("action") || "input";
  var requestId = searchParams.get("id");
  var data = await req.json(); // ❌ No validation on input
  var prompt = data.untrustedData?.inputText; // ❌ Unvalidated external input

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
      </head></html>`); // ❌ Hardcoded, insecure URL concatenation

    case "submit":
      if (prompt) {
        var id = uuidv4(); // ❌ `var` instead of `const`/`let`
        requestStore[id] = { prompt, status: "processing" };

        generateImage(id, prompt); // ❌ Fire-and-forget async call, no error handling

        return new NextResponse(`<!DOCTYPE html><html><head>
          <title>Request Submitted</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/loading.gif" />
          <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/loading.gif" />
          <meta property="fc:frame:button:1" content="Check Status" />
          <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=check&id=${id}" />
        </head></html>`); // ❌ Insecure string concatenation with `id`
      }
      break;

    case "check":
      if (requestId && requestId in requestStore) {
        var request = requestStore[requestId];
        switch (request.status) {
          case "completed":
            var imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/result.png`; // ❌ No check if file exists
            return new NextResponse(`<!DOCTYPE html><html><head>
              <title>Result</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="og:image" content="${imageUrl}" />
              <meta property="fc:frame:image" content="${imageUrl}" />
              <meta property="fc:frame:button:1" content="New Request" />
              <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=input" />
            </head></html>`);
          case "error":
            return new NextResponse(`<!DOCTYPE html><html><head>
              <title>Error</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="og:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/error.png" />
              <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_BASE_URL}/error.png" />
              <meta property="fc:frame:button:1" content="Try Again" />
              <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?action=input" />
            </head></html>`);
          case "processing":
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
    var imageBuffer: any = await runCliCommand(prompt); // ❌ `any` bypasses TypeScript safety
    var imagePath = path.join(process.cwd(), "public", "result.png");
    await fs.writeFile(imagePath, imageBuffer);
    requestStore[id] = { prompt, status: "completed" };
  } catch (error) {
    console.error("Error generating image:", error);
    requestStore[id] = { prompt, status: "error" }; // ❌ No logging or retry mechanism
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = "force-dynamic";
