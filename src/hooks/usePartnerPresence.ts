import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/auth';

export type Presence = { online: boolean; text: string } | null;

const ONLINE_MS = 90 * 1000; // « en ligne » si actif il y a moins de 90 s

function label(lastActive: string | null): Presence {
  if (!lastActive) return null;
  const diff = Date.now() - new Date(lastActive).getTime();
  if (isNaN(diff)) return null;
  if (diff < ONLINE_MS) return { online: true, text: 'en ligne' };
  const min = Math.floor(diff / 60000);
  if (min < 60) return { online: false, text: `vu il y a ${min} min` };
  const h = Math.floor(min / 60);
  if (h < 24) return { online: false, text: `vu il y a ${h} h` };
  const d = Math.floor(h / 24);
  return { online: false, text: `vu il y a ${d} j` };
}

/**
 * Présence en direct de la moitié : « en ligne » ou « vu il y a … ».
 * Se met à jour via Realtime (changement de last_active) et une horloge.
 */
export function usePartnerPresence(): Presence {
  const partnerId = useAuth((s) => s.partner?.id);
  const partnerLastActive = useAuth((s) => s.partner?.last_active ?? null);
  const [lastActive, setLastActive] = useState<string | null>(partnerLastActive);

  useEffect(() => { setLastActive(partnerLastActive); }, [partnerLastActive]);

  useEffect(() => {
    if (!partnerId) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase
      .channel(`presence-${partnerId}-${suffix}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${partnerId}` },
        (payload) => {
          const la = (payload.new as { last_active?: string }).last_active;
          if (la) setLastActive(la);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partnerId]);

  // Rafraîchit le « vu il y a … » régulièrement.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  return label(lastActive);
}
