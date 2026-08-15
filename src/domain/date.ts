export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function clampToMonthFirst(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, diff: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + diff);
  return x;
}

export function monthLabel(d: Date): string {
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
}

/** 日曜開始で6週(42セル)のカレンダー配列を作る */
export function getMonthGrid(viewMonth: Date): { cells: Date[]; monthIndex: number } {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay(); // 0=日
  const start = new Date(y, m, 1 - startDow);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return { cells, monthIndex: m };
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0=日
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, diff: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + diff);
  return x;
}

export function getWeekGrid(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(start, i));
  return days;
}

/** from から to までの日数（同日なら0）。時刻は無視して日付だけで数える。 */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function monthsBetween(birth: Date, onDate: Date): number {
  // ざっくり月単位（同日未満は1ヶ月減算）
  let months = (onDate.getFullYear() - birth.getFullYear()) * 12 + (onDate.getMonth() - birth.getMonth());
  if (onDate.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}
