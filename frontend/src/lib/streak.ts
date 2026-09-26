function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function computeStreak(createdAtDates: string[]): {
  current: number;
  practiceDays: Set<string>;
} {
  const practiceDays = new Set(createdAtDates.map((d) => toDayKey(new Date(d))));

  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!practiceDays.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!practiceDays.has(toDayKey(cursor))) {
      return { current: 0, practiceDays };
    }
  }

  while (practiceDays.has(toDayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, practiceDays };
}

export function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}
