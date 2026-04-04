import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/overview': { title: 'Overview', subtitle: 'Weekly coding pulse and private local analytics snapshot.' },
  '/activity': { title: 'Activity', subtitle: 'Patterns, breakdowns, and momentum across recent work.' },
  '/projects': { title: 'Projects', subtitle: 'Project-level focus, trends, and time allocation.' },
  '/languages': { title: 'Languages', subtitle: 'Language mix and shifts in your engineering time.' },
  '/sessions': { title: 'Sessions', subtitle: 'Recent coding sessions and focus quality indicators.' },
  '/settings': { title: 'Settings', subtitle: 'Privacy, tracking scope, and desktop behavior controls.' },
};

export function Header() {
  const { pathname } = useLocation();
  const meta = pageMeta[pathname] ?? pageMeta['/overview'];

  return (
    <header className="flex items-center justify-between border-b border-border/70 bg-background/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <Select defaultValue="7d">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Date Range</SelectLabel>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sessions" className="w-56 pl-9" />
        </div>
        <Badge variant="secondary">Local Only</Badge>
        <Badge variant="outline">Dark</Badge>
      </div>
    </header>
  );
}
