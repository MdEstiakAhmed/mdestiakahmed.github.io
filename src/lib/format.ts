const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });

/** '2024-04' -> 'Apr 2024' */
export function formatMonth(iso: string): string {
  const [year, month] = iso.split('-').map(Number);
  return monthFormatter.format(new Date(year ?? 1970, (month ?? 1) - 1));
}

export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}

function toMonths(iso: string): number {
  const [year, month] = iso.split('-').map(Number);
  return (year ?? 0) * 12 + ((month ?? 1) - 1);
}

/** Inclusive duration, LinkedIn style: '2 yrs 7 mos' */
export function formatDuration(start: string, end: string | null, now: Date = new Date()): string {
  const endMonths = end ? toMonths(end) : now.getFullYear() * 12 + now.getMonth();
  const total = endMonths - toMonths(start) + 1;
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts = [
    years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : '',
    months > 0 ? `${months} mo${months > 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  return parts.join(' ');
}
