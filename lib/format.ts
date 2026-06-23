// Display-only date formatting. Stored dates remain ISO (YYYY-MM-DD) in the
// database and in any <input type="date">; this only changes how a date
// reads as plain text elsewhere in the UI.
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "not recorded";
  const datePart = dateStr.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}/${month}/${year.slice(2)}`;
}
