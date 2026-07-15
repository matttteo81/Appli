/**
 * Petit outil réutilisable : charge les lignes d'une table appartenant au
 * couple, et les met à jour en TEMPS RÉEL (dès qu'un des deux ajoute / modifie
 * / supprime quelque chose, la liste se rafraîchit toute seule).
 *
 * Exemple d'usage :
 *   const { rows, loading } = useCoupleRows('notes');
 */
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';
import type { Database } from '@/types/db';

type Tables = Database['public']['Tables'];
type CoupleTable = keyof Tables;

type Options = {
  column?: string;
  ascending?: boolean;
};

export function useCoupleRows<T extends CoupleTable>(
  table: T,
  { column = 'created_at', ascending = false }: Options = {},
) {
  const couple = useSession((s) => s.couple);
  const coupleId = couple?.id ?? null;
  const [rows, setRows] = useState<Tables[T]['Row'][]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!coupleId) {
      setRows([]);
      setLoading(false);
      return;
    }
    // On passe par `any` en interne pour rester simple : les lignes renvoyées
    // gardent malgré tout leur type précis à l'utilisation.
    const { data } = await (supabase.from(table) as any)
      .select('*')
      .eq('couple_id', coupleId)
      .order(column, { ascending });
    setRows((data ?? []) as Tables[T]['Row'][]);
    setLoading(false);
  }, [coupleId, table, column, ascending]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reload();

    if (!coupleId) return;

    const channel = supabase
      .channel(`data:${table}:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table as string,
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (active) reload();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [coupleId, table, reload]);

  return { rows, loading, reload };
}
