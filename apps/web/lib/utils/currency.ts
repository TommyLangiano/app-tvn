/**
 * Formatta un valore numerico come valuta in Euro
 * IMPORTANTE: Mostra SEMPRE 2 decimali, mai arrotondato
 * @param value - Valore da formattare (può essere null/undefined)
 * @returns Stringa formattata (es: "1.234,56 €")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
