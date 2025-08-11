// Utility functions for handling dates in Italian timezone

/**
 * Get the current date in Italian timezone (Europe/Rome) as YYYY-MM-DD string
 */
export function getTodayInItalianTimezone(): string {
  const now = new Date();
  // Use Intl.DateTimeFormat to get correct Italian date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(now);
}

/**
 * Get a Date object representing today in Italian timezone
 */
export function getTodayDateInItalianTimezone(): Date {
  const now = new Date();
  // Use Intl.DateTimeFormat to get correct Italian time
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1; // Month is 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  
  return new Date(year, month, day);
}

/**
 * Convert a date string (YYYY-MM-DD) to a Date object in Italian timezone
 */
export function dateStringToItalianDate(dateString: string): Date {
  // Create date at midnight in Italian timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  
  // Adjust for Italian timezone
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const italianDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const offset = utcDate.getTime() - italianDate.getTime();
  
  return new Date(date.getTime() + offset);
}

/**
 * Format a date string or Date object for display in Italian format
 */
export function formatDateInItalian(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

/**
 * Get the start and end date of a month in YYYY-MM-DD format
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate().toString().padStart(2, '0')}`;
  
  return { startDate, endDate };
}

/**
 * Get the current month and year in Italian timezone
 */
export function getCurrentMonthAndYearInItalian(): { year: number; month: number } {
  const today = getTodayDateInItalianTimezone();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1
  };
}

/**
 * Convert a Date object to YYYY-MM-DD string without timezone issues
 */
export function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a YYYY-MM-DD string to Date object in local timezone
 */
export function stringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Get list of available months from a date range
 */
export function getAvailableMonths(startDate: string, endDate?: string): Array<{ year: number; month: number; label: string }> {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : getTodayDateInItalianTimezone();
  
  const months: Array<{ year: number; month: number; label: string }> = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const label = current.toLocaleDateString('it-IT', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'Europe/Rome'
    });
    
    months.push({ year, month, label });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months.reverse(); // Most recent first
}