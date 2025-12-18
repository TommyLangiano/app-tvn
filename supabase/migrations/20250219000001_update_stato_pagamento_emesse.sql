-- Aggiorna il constraint stato_pagamento per fatture_attive per includere 'Da Incassare'
ALTER TABLE fatture_attive
DROP CONSTRAINT IF EXISTS fatture_attive_stato_pagamento_check;

ALTER TABLE fatture_attive
ADD CONSTRAINT fatture_attive_stato_pagamento_check
CHECK (stato_pagamento IN ('Pagato', 'Non Pagato', 'Da Incassare'));

-- Aggiorna i record esistenti da 'Non Pagato' a 'Da Incassare' per le fatture attive
UPDATE fatture_attive
SET stato_pagamento = 'Da Incassare'
WHERE stato_pagamento = 'Non Pagato';
