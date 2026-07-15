-- =====================================================================
-- Batch 10 : réactions et réponses dans la messagerie 💬
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- Réactions : { "<user_id>": "❤️", ... }  et réponse à un message.
alter table public.messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;

-- Poser / retirer sa réaction (toggle) de façon atomique.
create or replace function public.react_to_message(p_message uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c uuid;
begin
  select couple_id into c from public.messages where id = p_message;
  if c is null or c is distinct from public.current_couple_id() then
    raise exception 'Message introuvable.';
  end if;
  update public.messages
    set reactions = case
      when coalesce(reactions ->> auth.uid()::text, '') = p_emoji
        then reactions - auth.uid()::text
      else jsonb_set(coalesce(reactions, '{}'::jsonb), array[auth.uid()::text], to_jsonb(p_emoji))
    end
    where id = p_message;
end;
$$;

revoke execute on function public.react_to_message(uuid, text) from anon, public;
grant  execute on function public.react_to_message(uuid, text) to authenticated;
