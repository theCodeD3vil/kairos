import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { recentSessions } from '@/data/mockDashboard';

export function SessionsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Sessions" description="Session timeline shell with mock focus indicators." contentClassName="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Start</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="pr-6 text-right">Focus Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="pl-6">{session.start}</TableCell>
                <TableCell>{session.duration}</TableCell>
                <TableCell>{session.project}</TableCell>
                <TableCell>{session.language}</TableCell>
                <TableCell className="pr-6 text-right">
                  <Badge variant={session.focusScore >= 85 ? 'secondary' : 'outline'}>{session.focusScore}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
