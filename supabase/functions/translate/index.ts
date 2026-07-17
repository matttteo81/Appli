// Edge Function Supabase : traduction de messages.
// -----------------------------------------------------------------------------
// Fonctionne SANS configuration : repli sur un endpoint de traduction gratuit.
// Option qualité : ajoute une clé DeepL pour une meilleure traduction :
//   supabase secrets set DEEPL_API_KEY=xxxx
//
// L'app appelle : supabase.functions.invoke('translate', { body: { text, target } })
// et attend { translation: string }.
// -----------------------------------------------------------------------------

const DEEPL_KEY = Deno.env.get('DEEPL_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, target, source } = await req.json();
    if (!text || !target) {
      return json({ error: 'text and target are required' }, 400);
    }

    let translation: string | null = null;

    // 1) DeepL si une clé est configurée (meilleure qualité).
    if (DEEPL_KEY) {
      translation = await translateWithDeepL(text, target);
    }

    // 2) Repli gratuit (aucune clé requise).
    if (!translation) {
      translation = await translateFree(text, target, source);
    }

    return json({ translation });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function translateWithDeepL(
  text: string,
  target: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      text,
      target_lang: target.toUpperCase(),
    });
    const resp = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = await resp.json();
    return data?.translations?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// Endpoint public de Google Translate (gtx) : gratuit, sans clé.
// Renvoie un tableau imbriqué : data[0] = segments, chaque segment[0] = texte.
async function translateFree(
  text: string,
  target: string,
  source?: string,
): Promise<string | null> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx' +
      `&sl=${encodeURIComponent(source || 'auto')}` +
      `&tl=${encodeURIComponent(target)}` +
      `&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data?.[0])) return null;
    return data[0]
      .map((seg: unknown[]) => (Array.isArray(seg) ? seg[0] : ''))
      .join('');
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
