// =====================================================================
// Edge Function : send-nudge
// =====================================================================
// Envoie une vraie notification push au partenaire via l'API Expo Push.
// Appelée par l'appli après avoir enregistré un "nudge" en base.
//
// Déploiement (depuis ton ordinateur, une seule fois) :
//   supabase functions deploy send-nudge
//
// Elle utilise la clé "service role" (déjà disponible dans l'environnement
// des Edge Functions) pour lire le jeton push du partenaire en toute sécurité.
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
    const { to_id, from_name, message } = await req.json();
    if (!to_id) {
      return new Response(JSON.stringify({ error: 'to_id manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client admin (service role) pour lire le jeton push du destinataire.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: recipient, error } = await admin
      .from('profiles')
      .select('push_token, display_name')
      .eq('id', to_id)
      .maybeSingle();

    if (error) throw error;
    if (!recipient?.push_token) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'no_push_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const title = from_name ? `${from_name} pense à toi 💛` : 'Tu me manques 💛';
    const body = message && message.length > 0 ? message : 'Tu me manques.';

    // Envoi via l'API Expo Push.
    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipient.push_token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        // Ces données servent à afficher le popup plein écran à l'ouverture.
        data: { type: 'nudge', message: body, from_name: from_name ?? '' },
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
