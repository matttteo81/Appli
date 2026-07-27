// Fonction de traduction — PRÊTE POUR AZURE (à déployer en août).
//
// Tant qu'elle n'est pas déployée, l'app utilise MyMemory côté client
// (voir src/lib/translate.ts, USE_EDGE_FN = false).
//
// Pour activer Azure :
//   1) Déployer cette fonction sur Supabase.
//   2) Définir les secrets :  AZURE_TRANSLATOR_KEY  et  AZURE_TRANSLATOR_REGION
//      (ex. « westeurope »).
//   3) Dans src/lib/translate.ts, passer USE_EDGE_FN à true.
// Si la clé Azure est absente, on retombe automatiquement sur MyMemory.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const AZURE_KEY = Deno.env.get('AZURE_TRANSLATOR_KEY');
const AZURE_REGION = Deno.env.get('AZURE_TRANSLATOR_REGION') ?? 'global';

async function azure(text: string, to: string, from?: string): Promise<string | null> {
  const params = new URLSearchParams({ 'api-version': '3.0', to });
  if (from) params.set('from', from);
  const res = await fetch(
    `https://api.cognitive.microsofttranslator.com/translate?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY!,
        'Ocp-Apim-Subscription-Region': AZURE_REGION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.[0]?.translations?.[0]?.text ?? null;
}

async function myMemory(text: string, to: string, from: string): Promise<string | null> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`,
  );
  const json = await res.json();
  const out = json?.responseData?.translatedText;
  return typeof out === 'string' && out.trim() ? out : null;
}

Deno.serve(async (req) => {
  try {
    const { text, to, from } = await req.json();
    if (!text || !to) {
      return new Response(JSON.stringify({ error: 'text et to requis' }), { status: 400 });
    }
    const translated = AZURE_KEY
      ? await azure(text, to, from)
      : await myMemory(text, to, from ?? 'fr');
    return new Response(JSON.stringify({ translated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
