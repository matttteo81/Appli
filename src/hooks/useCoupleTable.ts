import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/auth';

type TableName =
  | 'words'
  | 'rituals'
  | 'photos'
  | 'playlist_tracks'
  | 'nudges'
  | 'countdowns'
  | 'daily_answers'
  | 'messages'
  | 'game_responses'
  | 'memories'
  | 'wishes'
  | 'love_notes'
  | 'events'
  | 'saved_gifs'
  | 'reunion_tasks'
  | 'capsules';

/**
 * Charge les lignes d'une table pour le couple courant et se met à jour
 * en TEMPS RÉEL : toute insertion/modification/suppression recharge la liste.
 */
export function useCoupleTable<T extends { id: string }>(
  table: TableName,
  orderColumn = 'created_at',
  ascending = false,
) {
  // On dépend de l'IDENTIFIANT du couple (une chaîne), pas de l'objet couple :
  // ainsi l'abonnement temps réel ne se recrée pas à chaque fois que l'objet
  // couple change de référence. Cela évite le va-et-vient d'abonnements
  // (souscription/désinscription en boucle) qui déstabilisait l'application.
  const coupleId = useAuth((s) => s.couple?.id);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('couple_id', coupleId)
      .order(orderColumn, { ascending });
    setRows((data ?? []) as unknown as T[]);
    setLoading(false);
  }, [coupleId, table, orderColumn, ascending]);

  useEffect(() => {
    if (!coupleId) return;
    load();
    // Nom de canal unique par instance de hook : deux écrans qui écoutent la
    // même table (ex. photos sur la Carte et l'Album) ne se marchent plus
    // dessus, et removeChannel ne supprime plus le mauvais canal.
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`${table}-${coupleId}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `couple_id=eq.${coupleId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // On ne dépend QUE de coupleId et table : l'abonnement reste stable tant
    // que le couple ne change pas réellement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, table]);

  return { rows, loading, reload: load };
}
