export type CalendarDay = {
  date: string; // ISO date
  totalMinutes: number;
  sessionCount: number;
  topProject: string | null;
  topLanguage?: string | null;
  machineCount: number;
  hadActivity: boolean;
};

export type CalendarDayDetail = {
  date: string;
  totalMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  firstActiveAt: string | null;
  lastActiveAt: string | null;
  topProject: string | null;
  topLanguage?: string | null;
  machines: Array<{ name: string; os: string; minutes: number }>;
  sessions: Array<{
    id: string;
    start: string;
    durationMinutes: number;
    project: string;
    machine: string;
    language?: string;
  }>;
  projectBreakdown: Array<{
    project: string;
    minutes: number;
    sessionCount: number;
  }>;
};

const dayDetails: Record<string, CalendarDayDetail> = {
  '2026-04-05': {
    date: '2026-04-05',
    totalMinutes: 245,
    sessionCount: 4,
    averageSessionMinutes: 61,
    firstActiveAt: '09:12',
    lastActiveAt: '16:48',
    topProject: 'kairos-desktop',
    topLanguage: 'TypeScript',
    machines: [
      { name: "Myke's MacBook Pro", os: 'macOS 14.6', minutes: 190 },
      { name: 'Dev Desktop', os: 'Windows 11', minutes: 55 },
    ],
    sessions: [
      { id: 'apr05-1', start: '09:12', durationMinutes: 72, project: 'kairos-desktop', machine: "Myke's MacBook Pro", language: 'TypeScript' },
      { id: 'apr05-2', start: '11:03', durationMinutes: 54, project: 'billing-api', machine: 'Dev Desktop', language: 'Go' },
      { id: 'apr05-3', start: '14:10', durationMinutes: 63, project: 'kairos-vscode', machine: "Myke's MacBook Pro", language: 'TypeScript' },
      { id: 'apr05-4', start: '15:55', durationMinutes: 56, project: 'kairos-desktop', machine: "Myke's MacBook Pro", language: 'TypeScript' },
    ],
    projectBreakdown: [
      { project: 'kairos-desktop', minutes: 128, sessionCount: 2 },
      { project: 'kairos-vscode', minutes: 63, sessionCount: 1 },
      { project: 'billing-api', minutes: 54, sessionCount: 1 },
    ],
  },
  '2026-04-04': {
    date: '2026-04-04',
    totalMinutes: 187,
    sessionCount: 3,
    averageSessionMinutes: 62,
    firstActiveAt: '10:02',
    lastActiveAt: '16:40',
    topProject: 'billing-api',
    topLanguage: 'Go',
    machines: [
      { name: "Myke's MacBook Pro", os: 'macOS 14.6', minutes: 88 },
      { name: 'Ubuntu Workstation', os: 'Ubuntu 24.04', minutes: 99 },
    ],
    sessions: [
      { id: 'apr04-1', start: '10:02', durationMinutes: 88, project: 'kairos-desktop', machine: "Myke's MacBook Pro", language: 'TypeScript' },
      { id: 'apr04-2', start: '13:22', durationMinutes: 47, project: 'billing-api', machine: 'Ubuntu Workstation', language: 'Go' },
      { id: 'apr04-3', start: '16:40', durationMinutes: 52, project: 'billing-api', machine: 'Ubuntu Workstation', language: 'Go' },
    ],
    projectBreakdown: [
      { project: 'billing-api', minutes: 99, sessionCount: 2 },
      { project: 'kairos-desktop', minutes: 88, sessionCount: 1 },
    ],
  },
  '2026-04-03': {
    date: '2026-04-03',
    totalMinutes: 203,
    sessionCount: 3,
    averageSessionMinutes: 68,
    firstActiveAt: '09:05',
    lastActiveAt: '15:45',
    topProject: 'studio-web',
    topLanguage: 'TypeScript',
    machines: [
      { name: "Myke's MacBook Pro", os: 'macOS 14.6', minutes: 134 },
      { name: 'Dev Desktop', os: 'Windows 11', minutes: 69 },
    ],
    sessions: [
      { id: 'apr03-1', start: '09:05', durationMinutes: 76, project: 'kairos-desktop', machine: "Myke's MacBook Pro", language: 'TypeScript' },
      { id: 'apr03-2', start: '12:18', durationMinutes: 69, project: 'billing-api', machine: 'Dev Desktop', language: 'Go' },
      { id: 'apr03-3', start: '15:45', durationMinutes: 58, project: 'studio-web', machine: "Myke's MacBook Pro", language: 'TypeScript' },
    ],
    projectBreakdown: [
      { project: 'studio-web', minutes: 58, sessionCount: 1 },
      { project: 'kairos-desktop', minutes: 76, sessionCount: 1 },
      { project: 'billing-api', minutes: 69, sessionCount: 1 },
    ],
  },
  '2026-04-02': {
    date: '2026-04-02',
    totalMinutes: 157,
    sessionCount: 3,
    averageSessionMinutes: 52,
    firstActiveAt: '10:14',
    lastActiveAt: '16:31',
    topProject: 'kairos-desktop',
    topLanguage: 'TypeScript',
    machines: [
      { name: "Myke's MacBook Pro", os: 'macOS 14.6', minutes: 106 },
      { name: 'Ubuntu Workstation', os: 'Ubuntu 24.04', minutes: 51 },
    ],
    sessions: [
      { id: 'apr02-1', start: '10:14', durationMinutes: 64, project: 'kairos-desktop', machine: "Myke's MacBook Pro", language: 'TypeScript' },
      { id: 'apr02-2', start: '13:02', durationMinutes: 51, project: 'billing-api', machine: 'Ubuntu Workstation', language: 'Rust' },
      { id: 'apr02-3', start: '16:31', durationMinutes: 42, project: 'studio-web', machine: "Myke's MacBook Pro", language: 'TypeScript' },
    ],
    projectBreakdown: [
      { project: 'kairos-desktop', minutes: 64, sessionCount: 1 },
      { project: 'billing-api', minutes: 51, sessionCount: 1 },
      { project: 'studio-web', minutes: 42, sessionCount: 1 },
    ],
  },
  '2026-04-01': {
    date: '2026-04-01',
    totalMinutes: 120,
    sessionCount: 2,
    averageSessionMinutes: 60,
    firstActiveAt: '09:28',
    lastActiveAt: '11:50',
    topProject: 'kairos-vscode',
    topLanguage: 'TypeScript',
    machines: [{ name: "Myke's MacBook Pro", os: 'macOS 14.6', minutes: 120 }],
    sessions: [
      { id: 'apr01-1', start: '09:28', durationMinutes: 57, project: 'kairos-vscode', machine: "Myke's MacBook Pro", language: 'TypeScript' },
      { id: 'apr01-2', start: '11:50', durationMinutes: 63, project: 'billing-api', machine: "Myke's MacBook Pro", language: 'Go' },
    ],
    projectBreakdown: [
      { project: 'kairos-vscode', minutes: 57, sessionCount: 1 },
      { project: 'billing-api', minutes: 63, sessionCount: 1 },
    ],
  },
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function getMonthActivity(year: number, month: number): CalendarDay[] {
  const totalDays = daysInMonth(year, month);
  const days: CalendarDay[] = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    const detail = dayDetails[iso];
    if (detail) {
      days.push({
        date: iso,
        totalMinutes: detail.totalMinutes,
        sessionCount: detail.sessionCount,
        topProject: detail.topProject,
        topLanguage: detail.topLanguage,
        machineCount: detail.machines.length,
        hadActivity: true,
      });
    } else {
      days.push({
        date: iso,
        totalMinutes: 0,
        sessionCount: 0,
        topProject: null,
        topLanguage: null,
        machineCount: 0,
        hadActivity: false,
      });
    }
  }
  return days;
}

export function getDayDetail(date: string): CalendarDayDetail | null {
  return dayDetails[date] ?? null;
}
