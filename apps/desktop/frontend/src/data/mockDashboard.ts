export type SessionItem = {
  id: string;
  project: string;
  language: string;
  start: string;
  duration: string;
  focusScore: number;
};

export const dashboardStats = {
  todayMinutes: 312,
  weekMinutes: 1715,
  focusHours: 23.4,
  contextSwitches: 18,
};

export const weeklyTrend = [
  { day: 'Mon', minutes: 210 },
  { day: 'Tue', minutes: 255 },
  { day: 'Wed', minutes: 188 },
  { day: 'Thu', minutes: 324 },
  { day: 'Fri', minutes: 296 },
  { day: 'Sat', minutes: 271 },
  { day: 'Sun', minutes: 171 },
];

export const topProjects = [
  { name: 'kairos-desktop', minutes: 562, delta: '+12%' },
  { name: 'kairos-cli', minutes: 408, delta: '+6%' },
  { name: 'activity-engine', minutes: 331, delta: '-4%' },
  { name: 'docs-site', minutes: 202, delta: '+9%' },
];

export const topLanguages = [
  { name: 'TypeScript', share: 46, trend: 'Rising' },
  { name: 'Go', share: 31, trend: 'Stable' },
  { name: 'SQL', share: 12, trend: 'Rising' },
  { name: 'Bash', share: 7, trend: 'Stable' },
  { name: 'Markdown', share: 4, trend: 'Falling' },
];

export const recentSessions: SessionItem[] = [
  { id: 's1', project: 'kairos-desktop', language: 'TypeScript', start: '09:15', duration: '1h 22m', focusScore: 88 },
  { id: 's2', project: 'activity-engine', language: 'Go', start: '11:04', duration: '54m', focusScore: 79 },
  { id: 's3', project: 'kairos-cli', language: 'TypeScript', start: '13:10', duration: '1h 49m', focusScore: 91 },
  { id: 's4', project: 'docs-site', language: 'Markdown', start: '15:48', duration: '38m', focusScore: 73 },
  { id: 's5', project: 'kairos-desktop', language: 'TypeScript', start: '17:05', duration: '1h 06m', focusScore: 86 },
];

export const hourlyPattern = [18, 24, 35, 44, 61, 72, 68, 55, 42, 29, 21, 15];

export const projectActivityBreakdown = [
  { day: 'Mon', coding: 175, review: 42, meetings: 28 },
  { day: 'Tue', coding: 201, review: 30, meetings: 22 },
  { day: 'Wed', coding: 149, review: 36, meetings: 40 },
  { day: 'Thu', coding: 231, review: 48, meetings: 31 },
  { day: 'Fri', coding: 205, review: 41, meetings: 26 },
];
