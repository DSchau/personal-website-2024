export function getUtcYearBounds(year: number): {
  start: Date;
  endExclusive: Date;
  endInclusive: Date;
} {
  const endExclusive = new Date(Date.UTC(year + 1, 0, 1));

  return {
    start: new Date(Date.UTC(year, 0, 1)),
    endExclusive,
    endInclusive: new Date(endExclusive.getTime() - 1),
  };
}

export function isDateInUtcYear(date: Date, year: number): boolean {
  const { start, endExclusive } = getUtcYearBounds(year);
  const timestamp = date.getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp >= start.getTime() &&
    timestamp < endExclusive.getTime()
  );
}
