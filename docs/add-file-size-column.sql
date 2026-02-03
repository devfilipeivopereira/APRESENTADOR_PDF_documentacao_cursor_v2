-- Obrigatório: execute no SQL Editor do Supabase para o tamanho do ficheiro
-- ser gravado no envio e mostrado na playlist (ao lado do nome e nos detalhes).
-- Depois: reinicie o PostgREST na VPS: docker service update --force supabase_supabase_rest

alter table presentations add column if not exists file_size bigint;
