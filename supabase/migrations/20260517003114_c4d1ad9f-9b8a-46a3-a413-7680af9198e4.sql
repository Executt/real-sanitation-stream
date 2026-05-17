-- Remover medições órfãs (sem ETE correspondente) para permitir o FK
DELETE FROM public.dbo_medicoes m
WHERE NOT EXISTS (SELECT 1 FROM public.etes e WHERE e.id = m.ete_id);

ALTER TABLE public.dbo_medicoes
  ADD CONSTRAINT dbo_medicoes_ete_id_fkey
  FOREIGN KEY (ete_id) REFERENCES public.etes(id) ON DELETE CASCADE;