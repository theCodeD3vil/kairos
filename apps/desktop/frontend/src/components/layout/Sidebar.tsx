import { NavLink } from 'react-router-dom';
import { Activity, FolderKanban, Gauge, Languages, Settings, Timer, Orbit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/overview', label: 'Overview', icon: Gauge },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/languages', label: 'Languages', icon: Languages },
  { to: '/sessions', label: 'Sessions', icon: Timer },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border/70 bg-card/60 backdrop-blur">
      <div className="border-b border-border/70 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/15 p-2 text-primary">
            <Orbit className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide">Kairos</p>
            <p className="text-xs text-muted-foreground">Desktop</p>
          </div>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-73px)]">
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  isActive && 'bg-accent text-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
