-- Fix audit trigger to NOT log DELETE operations
-- DELETE operations cannot create audit entries because of foreign key constraint
-- The nota_spesa record is deleted BEFORE the audit entry would be created

DROP TRIGGER IF EXISTS audit_nota_spesa_trigger ON note_spesa;

CREATE OR REPLACE FUNCTION audit_nota_spesa_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO note_spesa_azioni (
      nota_spesa_id, tenant_id, azione,
      eseguita_da, stato_nuovo
    ) VALUES (
      NEW.id, NEW.tenant_id, 'creata',
      auth.uid(), NEW.stato
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- If stato changed
    IF OLD.stato != NEW.stato THEN
      INSERT INTO note_spesa_azioni (
        nota_spesa_id, tenant_id, azione,
        eseguita_da, stato_precedente, stato_nuovo,
        motivo
      ) VALUES (
        NEW.id, NEW.tenant_id,
        CASE
          WHEN NEW.stato = 'approvato' THEN 'approvata'
          WHEN NEW.stato = 'rifiutato' THEN 'rifiutata'
          WHEN NEW.stato = 'da_approvare' THEN 'sottomessa'
          ELSE 'modificata'
        END,
        auth.uid(), OLD.stato, NEW.stato,
        NEW.motivo_rifiuto
      );
    -- If only data modified (no stato change)
    ELSIF OLD.importo != NEW.importo OR OLD.descrizione IS DISTINCT FROM NEW.descrizione THEN
      INSERT INTO note_spesa_azioni (
        nota_spesa_id, tenant_id, azione,
        eseguita_da, stato_nuovo,
        dati_modificati
      ) VALUES (
        NEW.id, NEW.tenant_id, 'modificata',
        auth.uid(), NEW.stato,
        jsonb_build_object(
          'importo_old', OLD.importo,
          'importo_new', NEW.importo,
          'descrizione_old', OLD.descrizione,
          'descrizione_new', NEW.descrizione
        )
      );
    END IF;
    RETURN NEW;

  -- REMOVED: DELETE trigger - cannot create audit entry after record is deleted
  -- CASCADE DELETE will automatically remove related note_spesa_azioni records

  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger WITHOUT DELETE operation
CREATE TRIGGER audit_nota_spesa_trigger
  AFTER INSERT OR UPDATE ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION audit_nota_spesa_changes();

COMMENT ON FUNCTION audit_nota_spesa_changes IS 'Audit trigger for note_spesa - logs INSERT and UPDATE only (DELETE handled by CASCADE)';
