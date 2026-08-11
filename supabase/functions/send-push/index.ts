// =====================================================================
// Edge Function : send-push
// =====================================================================
// Envoie une notification push générique à ta moitié via l'API Expo Push.
// Utilisée pour prévenir d'un nouveau message, d'une photo, d'un petit mot…
//
// Déploiement (depuis ton ordinateur, une seule fois) :
//   supabase functions deploy send-push
//
// Entrée attendue (JSON) :
//   { to_id: string, title?: string, body?: string, data?: object }
//
// Elle lit le jeton push du destinataire avec la clé "service role"
// (disponible dans l'environnement des Edge Functions).
// =====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to_id, title, body, data } = await req.json();
    if (!to_id) {
      return new Response(JSON.stringify({ error: 'to_id manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: recipient, error } = await admin
      .from('profiles')
      .select('push_token')
      .eq('id', to_id)
      .maybeSingle();

    if (error) throw error;
    if (!recipient?.push_token) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'no_push_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient.push_token,
        title: title ?? 'Fil 💛',
        body: body ?? '',
        sound: 'default',
        priority: 'high',
        data: data ?? {},
      }),
    });

    const pushJson = await pushRes.json();
    return new Response(JSON.stringify({ ok: true, expo: pushJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
