-- Rimuovi il limite di importo massimo dalla tabella categorie_note_spesa
ALTER TABLE public.categorie_note_spesa
DROP COLUMN IF EXISTS importo_massimo;

-- Rimuovi la categoria "Rappresentanza" (se esiste)
DELETE FROM public.categorie_note_spesa
WHERE codice = 'rappresentanza' OR LOWER(nome) = 'rappresentanza';

-- Aggiungi la nuova categoria "Carburante" per tutti i tenant esistenti
-- Questa query inserirà la categoria solo se non esiste già
INSERT INTO public.categorie_note_spesa
  (tenant_id, nome, codice, descrizione, colore, icona, richiede_allegato, attiva, ordinamento, created_by)
SELECT
  t.id as tenant_id,
  'Carburante' as nome,
  'carburante' as codice,
  'Spese per carburante e rifornimenti' as descrizione,
  '#EF4444' as colore,
  'Fuel' as icona,
  true as richiede_allegato,
  true as attiva,
  (SELECT COALESCE(MAX(ordinamento), 0) + 1 FROM categorie_note_spesa WHERE tenant_id = t.id) as ordinamento,
  t.created_by
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorie_note_spesa c
  WHERE c.tenant_id = t.id
  AND (c.codice = 'carburante' OR LOWER(c.nome) = 'carburante')
);

-- Aggiorna eventuali note spesa esistenti che usavano "rappresentanza"
-- spostandole sulla categoria "altro" o "carburante" se appropriato
-- (opzionale - commentato per sicurezza)
-- UPDATE public.note_spesa
-- SET categoria = (
--   SELECT id FROM public.categorie_note_spesa
--   WHERE tenant_id = note_spesa.tenant_id
--   AND codice = 'altro'
--   LIMIT 1
-- )
-- WHERE categoria IN (
--   SELECT id FROM public.categorie_note_spesa
--   WHERE codice = 'rappresentanza' OR LOWER(nome) = 'rappresentanza'
-- );
