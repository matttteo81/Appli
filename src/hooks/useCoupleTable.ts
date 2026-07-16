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
  | 'love_notes';

/**
 * Charge les lignes d'une table pour le couple courant et se met à jour
 * en TEMPS RÉEL : toute insertion/modification/suppression recharge la liste.
 */
export function useCoupleTable<T extends { id: string }>(
  table: TableName,
  orderColumn = 'created_at',
  ascending = false,
) {
  const couple = useAuth((s) => s.couple);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!couple) return;
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('couple_id', couple.id)
      .order(orderColumn, { ascending });
    setRows((data ?? []) as unknown as T[]);
    setLoading(false);
  }, [couple, table, orderColumn, ascending]);

  useEffect(() => {
    if (!couple) return;
    load();
    const channel = supabase
      .channel(`${table}-${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `couple_id=eq.${couple.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple, table, load]);

  return { rows, loading, reload: load };
}
