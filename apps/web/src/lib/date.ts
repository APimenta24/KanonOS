export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function getDateOfWeek(year: number, week: number, dayOfWeek: number = 1): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const offset = dow <= 4 ? dow - 1 : dow + 6;
  simple.setUTCDate(simple.getUTCDate() - offset + (dayOfWeek - 1));
  return simple;
}

export function getWeekDates(year: number, week: number): Date[] {
  const monday = getDateOfWeek(year, week, 1);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_OF_WEEK_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function addWeeks(year: number, week: number, delta: number): { year: number; week: number } {
  let newWeek = week + delta;
  let newYear = year;
  if (newWeek < 1) {
    newYear--;
    newWeek = 52;
  } else if (newWeek > 52) {
    newYear++;
    newWeek = 1;
  }
  return { year: newYear, week: newWeek };
}

export function weekRangeString(year: number, week: number): string {
  const dates = getWeekDates(year, week);
  const start = formatDate(dates[0]);
  const end = formatDate(dates[6]);
  return `${start} – ${end}`;
}
