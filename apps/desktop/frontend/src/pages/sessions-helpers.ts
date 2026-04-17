import type { SessionDetailRecord } from '@/components/sessions/SessionDetailsDialog';
import type { SessionsScreenData } from '@/lib/backend/page-data';

export function createSessionDetailRecord(
  session: SessionsScreenData['sessions'][number],
): SessionDetailRecord {
  return {
    id: session.id,
    project: session.project,
    language: session.language,
    durationMinutes: session.durationMinutes,
    startAt: session.startAt,
    latestActivityAt: session.rangeEndAt,
    machineName: session.machineName,
    osLabel: session.osLabel,
    sessionCount: session.sessionCount,
    machineCount: session.machineCount,
    subSessions: session.subSessions,
  };
}
