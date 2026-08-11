import { supabase } from './supabase';

/**
 * Envoie une notification push à ta moitié (si elle a autorisé les notifs).
 * Silencieux en cas d'échec : l'action principale (message, photo…) a déjà
 * réussi, la notif n'est qu'un bonus.
 */
export async function pushToPartner(
  toId: string | null | undefined,
  title: string,
  body: string,
  type = 'content',
) {
  if (!toId) return;
  try {
    await supabase.functions.invoke('send-push', {
      body: { to_id: toId, title, body, data: { type } },
    });
  } catch {
    // on ignore : pas de notif, mais le contenu est bien enregistré.
  }
}
