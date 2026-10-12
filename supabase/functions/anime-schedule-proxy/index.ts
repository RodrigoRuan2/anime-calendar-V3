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
  if (url.searchParams.get("health") === "1") {
    const projectUrl = Deno.env.get("SUPABASE_URL");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secret = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!projectUrl || !secret) return new Response("Database health check unavailable", { status: 503 });

    // Consulta real ao Postgres; não devolve linhas nem expõe a chave ao cliente.
    const headers: Record<string, string> = { apikey: secret };
    if (secret.split(".").length === 3) headers.Authorization = `Bearer ${secret}`;
    const database = await fetch(`${projectUrl}/rest/v1/user_anime_library?select=id&limit=1`, { headers });
    return new Response(database.ok ? "Database reachable" : "Database unavailable", {
      status: database.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  if (url.searchParams.has("path")) return new Response("Unsupported path", { status: 400, headers: CORS_HEADERS });
  const params = new URLSearchParams(url.searchParams);

  const API_KEY = Deno.env.get("ANIMESCHEDULE_API_KEY");
  if (!API_KEY) return new Response("AnimeSchedule is not configured", { status: 503, headers: CORS_HEADERS });
  const targetUrl = `https://animeschedule.net/api/v3/timetables/sub?${params.toString()}`;

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
