import { supabase } from './supabase';

/**
 * Envoie une petite attention à ta moitié (« Tu me manques », « Je pense fort
 * à toi »…). Enregistre un nudge (popup en direct chez le partenaire) puis
 * déclenche la notification push (même app fermée).
 */
export async function sendAttention(params: {
  coupleId: string;
  fromId: string;
  fromName: string;
  toId: string;
  message: string;
}) {
  const { coupleId, fromId, fromName, toId, message } = params;
  await supabase.from('nudges').insert({
    couple_id: coupleId,
    from_id: fromId,
    to_id: toId,
    message,
  });
  await supabase.functions.invoke('send-nudge', {
    body: { to_id: toId, from_name: fromName, message },
  });
}
