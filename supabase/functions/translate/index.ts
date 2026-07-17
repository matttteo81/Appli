// Edge Function Supabase : traduction de messages.
// -----------------------------------------------------------------------------
// Déploiement :
//   supabase functions deploy translate
// Secret attendu (choisis un fournisseur) :
//   supabase secrets set DEEPL_API_KEY=xxxx        (ou GOOGLE_TRANSLATE_API_KEY)
//
// L'app appelle cette fonction via supabase.functions.invoke('translate',
// { body: { text, target } }) et attend { translation: string }.
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
    const { text, target } = await req.json();
    if (!text || !target) {
      return json({ error: 'text and target are required' }, 400);
    }

    if (!DEEPL_KEY) {
      // Pas encore configuré : on renvoie une erreur douce.
      return json({ error: 'translation provider not configured' }, 501);
    }

    // Exemple avec DeepL (API gratuite : api-free.deepl.com).
    const params = new URLSearchParams({
      text,
      target_lang: String(target).toUpperCase(),
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
    const translation = data?.translations?.[0]?.text ?? null;
    return json({ translation });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
