/**
 * Genera uno slug URL-friendly da un testo
 */
export function generateSlug(text: string, maxLength: number = 60): string {
  let slug = text
    .toLowerCase()
    .trim()
    // Rimuovi accenti
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Sostituisci spazi e caratteri speciali con trattini
    .replace(/[^a-z0-9]+/g, '-')
    // Rimuovi trattini multipli
    .replace(/-+/g, '-')
    // Rimuovi trattini iniziali e finali
    .replace(/^-+|-+$/g, '');

  // Limita lunghezza
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    // Rimuovi ultima parola parziale
    slug = slug.replace(/-[^-]*$/, '');
  }

  return slug;
}

/**
 * Genera uno slug univoco aggiungendo un suffisso dall'ID
 */
export function generateUniqueSlug(text: string, id: string, maxLength: number = 60): string {
  const baseSlug = generateSlug(text, maxLength - 9); // Lascia spazio per -XXXXXXXX
  const idSuffix = id.substring(0, 8);
  return `${baseSlug}-${idSuffix}`;
}
