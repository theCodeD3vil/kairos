import { describe, expect, it } from 'vitest';
import {
  createSessionDetailRecord,
} from '@/pages/sessions-helpers';

describe('sessions-helpers', () => {
  it('maps session details latest activity from group end time', () => {
    const detail = createSessionDetailRecord({
      id: 'group-1',
      project: 'kairos',
      language: 'TypeScript',
      durationMinutes: 84,
      startAt: 'Apr 13, 09:00',
      rangeStartAt: 'Apr 13, 09:00',
      rangeEndAt: 'Apr 13, 12:11',
      machineName: 'Alpha',
      osLabel: 'macOS',
      sessionCount: 3,
      machineCount: 1,
      subSessions: [
        {
          id: 'sub-1',
          language: 'TypeScript',
          durationMinutes: 30,
          startAt: 'Apr 13, 09:00',
          endAt: 'Apr 13, 09:30',
          machineName: 'Alpha',
          osLabel: 'macOS',
        },
      ],
    });

    expect(detail.latestActivityAt).toBe('Apr 13, 12:11');
    expect(detail.startAt).toBe('Apr 13, 09:00');
  });
});
