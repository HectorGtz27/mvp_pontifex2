/**
 * Shared formatting utilities used across the application.
 */

/**
 * Formats a number as Mexican peso currency.
 * @param {number} mxn
 * @returns {string}  e.g. "$1,250,000"
 */
export function formatMoney(mxn) {
  if (typeof mxn !== 'number' || Number.isNaN(mxn)) return '—'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(mxn)
}

/**
 * Formats an ISO date string in medium es-MX style.
 * @param {string|null} iso
 * @returns {string}  e.g. "7 mar 2026"
 */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(iso))
}
