import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const params = new URLSearchParams(url.searchParams);
  const path = params.get("path") ?? "/api/v3/timetables/sub";
  params.delete("path");

  const API_KEY = Deno.env.get("ANIMESCHEDULE_API_KEY");
  const targetUrl = `https://animeschedule.net${path}?${params.toString()}`;

  const response = await fetch(targetUrl, {
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    status: response.status,
  });
});