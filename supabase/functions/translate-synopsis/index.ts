import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_LENGTH = 4_000;
const MAX_CHUNK_LENGTH = 450;

function splitText(text: string) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let chunk = "";

  for (const word of words) {
    const candidate = chunk ? `${chunk} ${word}` : word;
    if (candidate.length > MAX_CHUNK_LENGTH && chunk) {
      chunks.push(chunk);
      chunk = word;
    } else {
      chunk = candidate;
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

async function translateChunk(text: string) {
  const params = new URLSearchParams({ q: text, langpair: "en|pt-BR" });
  const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
  if (!response.ok) throw new Error("Translation provider unavailable.");

  const data = await response.json();
  const translated = data.responseData?.translatedText;
  if (!translated) throw new Error("Translation provider returned no text.");
  return translated;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: "Invalid text." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const translatedText = (await Promise.all(splitText(text.trim()).map(translateChunk))).join(" ");
    return new Response(JSON.stringify({ text: translatedText }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Translation failed." }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
