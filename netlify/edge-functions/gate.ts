// Seiten-Schalter: entscheidet pro Aufruf, ob "hauptseite" oder "mariettas"
// gerade online ist, und bedient nebenbei die Steuer-Endpunkte /api/status
// und /api/schalten. Alles läuft privat über Netlify Blobs — nichts davon
// ist in GitHub sichtbar, nur dieser Quellcode (das Passwort steht in einer
// Netlify-Umgebungsvariable, nicht im Repo).
import { getStore } from "https://esm.sh/@netlify/blobs@8.2.0";
import type { Context } from "https://edge.netlify.com";

const WARTUNG_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Gerade nicht erreichbar</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f4eddd;color:#2a2116;text-align:center;padding:24px;
    font-family:"Hoefler Text","Iowan Old Style",Palatino,Georgia,serif}
  .orn{width:34px;margin:0 auto 22px;color:#a8823c}
  h1{font-size:1.6rem;font-weight:600;letter-spacing:.02em}
  p{margin-top:14px;color:#6f6349;font-size:1.02rem;line-height:1.6}
</style>
</head>
<body>
<main>
  <div class="orn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 3 5 8 5-4 1-7 4-8 15-1-11-4-14-8-15 5 0 7-1 8-5Z"/></svg></div>
  <h1>Diese Seite ist gerade offline.</h1>
  <p>Schauen Sie bald wieder vorbei.</p>
</main>
</body>
</html>`;

type Bereich = "hauptseite" | "mariettas";
const BEREICHE: Bereich[] = ["hauptseite", "mariettas"];
const DAUER_MS: Record<string, number> = {
  "1 Stunde": 3_600_000,
  "2 Stunden": 7_200_000,
  "4 Stunden": 14_400_000,
};

type Rec = { state: "an" | "aus"; until: number | null; changed: number } | null;

function isAsset(path: string): boolean {
  return /\.[a-z0-9]+$/i.test(path) && !path.endsWith(".html");
}

function bereichFor(path: string): Bereich {
  if (path.startsWith("/mariettas-laden") || path === "/m" || path === "/m/") return "mariettas";
  return "hauptseite";
}

function isOffline(rec: Rec): boolean {
  if (!rec) return false;
  if (rec.state === "aus") return true;
  if (rec.state === "an" && rec.until && rec.until < Date.now()) return true;
  return false;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const store = getStore({ name: "schalter", consistency: "strong" });

  // --- Status abfragen (öffentlich lesbar, keine sensiblen Daten) ---
  if (path === "/api/status" && request.method === "GET") {
    const [h, m] = await Promise.all([
      store.get("hauptseite", { type: "json" }).catch(() => null),
      store.get("mariettas", { type: "json" }).catch(() => null),
    ]);
    return new Response(
      JSON.stringify({
        hauptseite: { offline: isOffline(h), ...(h ?? {}) },
        mariettas: { offline: isOffline(m), ...(m ?? {}) },
      }),
      { headers: { "content-type": "application/json", "cache-control": "no-store" } }
    );
  }

  // --- Schalten (braucht das geheime Passwort) ---
  if (path === "/api/schalten" && request.method === "POST") {
    const secret = request.headers.get("x-schalter-secret");
    const expected = Deno.env.get("SCHALTER_SECRET");
    if (!expected || secret !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    let body: { bereich?: string; zustand?: string; dauer?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "bad request" }), { status: 400 });
    }
    const { bereich, zustand, dauer } = body;
    if (!bereich || !BEREICHE.includes(bereich as Bereich) || (zustand !== "an" && zustand !== "aus")) {
      return new Response(JSON.stringify({ error: "invalid input" }), { status: 400 });
    }
    let until: number | null = null;
    if (zustand === "an" && dauer && DAUER_MS[dauer]) until = Date.now() + DAUER_MS[dauer];
    await store.setJSON(bereich, { state: zustand, until, changed: Date.now() });
    return new Response(JSON.stringify({ ok: true, bereich, zustand, until }), {
      headers: { "content-type": "application/json" },
    });
  }

  // --- alles andere: Schalt-Seite, Assets, Netlify-Interna nie blockieren ---
  if (path.startsWith("/schalter") || path.startsWith("/api/") || path.startsWith("/.netlify/") || isAsset(path)) {
    return context.next();
  }

  // --- normale Seite: passt der Bereich, ist er "aus"? ---
  const bereich = bereichFor(path);
  const rec = (await store.get(bereich, { type: "json" }).catch(() => null)) as Rec;
  if (isOffline(rec)) {
    return new Response(WARTUNG_HTML, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return context.next();
};

export const config = { path: "/*" };
