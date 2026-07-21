/**
 * Date utility functions for Mexican timezone (America/Mexico_City)
 */

export function getTodayDateStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Determines if a reservation is active on a target date.
 * Standard hotel night logic: checkIn <= targetDate < checkOut
 * Same-day stays (checkIn === checkOut): checkIn === targetDate
 */
export function isReservationActiveOnDate(
  res: { check_in?: string; check_out?: string; dates?: string; status?: string } | null | undefined,
  targetDate: string
): boolean {
  if (!res) return false;
  const statusLower = String(res.status || '').toLowerCase();
  if (
    statusLower === 'cancelled' ||
    statusLower === 'checkedout' ||
    statusLower === 'checked_out' ||
    statusLower === 'completed'
  ) {
    return false;
  }

  const checkIn = res.check_in || (res.dates?.split(' - ')[0] ?? '');
  const checkOut = res.check_out || (res.dates?.split(' - ')[1] ?? '');
  if (!checkIn || !checkOut) return false;

  if (checkIn === checkOut) {
    return targetDate === checkIn;
  }

  return targetDate >= checkIn && targetDate < checkOut;
}
