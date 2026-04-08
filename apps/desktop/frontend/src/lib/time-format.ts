export type DurationDisplay = 'axis' | 'short' | 'long';

type DurationParts = {
  days: number;
  hours: number;
  minutes: number;
};

function splitMinutes(totalMinutes: number): DurationParts {
  const normalized = Number.isFinite(totalMinutes) ? Math.max(0, Math.round(totalMinutes)) : 0;
  const days = Math.floor(normalized / 1440);
  const hours = Math.floor((normalized % 1440) / 60);
  const minutes = normalized % 60;
  return { days, hours, minutes };
}

export function formatDurationMinutes(totalMinutes: number, display: DurationDisplay = 'short'): string {
  const { days, hours, minutes } = splitMinutes(totalMinutes);
  const totalHours = days * 24 + hours;

  if (display === 'axis') {
    if (totalHours === 0) return `${minutes}m`;
    if (minutes === 0) return `${totalHours}h`;
    return `${totalHours}h ${minutes}m`;
  }

  if (display === 'long') {
    if (days > 0) {
      if (hours === 0 && minutes === 0) return `${days}d`;
      if (minutes === 0) return `${days}d ${hours}h`;
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (totalHours === 0) return `${minutes}m`;
    if (minutes === 0) return `${totalHours}h`;
    return `${totalHours}h ${minutes}m`;
  }

  if (totalHours === 0) return `${minutes}m`;
  if (minutes === 0) return `${totalHours}h`;
  return `${totalHours}h ${minutes}m`;
}

export function formatDurationHours(totalHours: number, display: DurationDisplay = 'axis'): string {
  const minutes = Number.isFinite(totalHours) ? totalHours * 60 : 0;
  return formatDurationMinutes(minutes, display);
}
