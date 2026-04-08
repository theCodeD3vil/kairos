import { Bell, Home, LineChart, Settings, CalendarDays, Palette, CalendarRange } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationsFilter, type FilterItem } from '@/components/ruixen/notifications-filter';
import { SlidingCapsuleNav, type NavTab } from '@/components/satisui/sliding-capsule-nav';
import { Button } from '@/components/ui/button';
import kairosMark from '@/assets/kairos-mark.svg';
import { LAST_PAGE_STORAGE_KEY } from '@/lib/settings/preferences';
import { useNotifications } from '@/lib/hooks/useNotifications';

const showTheme = import.meta.env.DEV;

const tabs: NavTab[] = (
  [
    { title: 'Dashboard', url: '/overview', icon: <Home size={16} /> },
    { title: 'Analytics', url: '/analytics', icon: <LineChart size={16} /> },
    { title: 'Sessions', url: '/sessions', icon: <CalendarDays size={16} /> },
    { title: 'Calendar', url: '/calendar', icon: <CalendarRange size={16} /> },
    { title: 'Settings', url: '/settings', icon: <Settings size={16} /> },
    showTheme ? { title: 'Theme', url: '/theme', icon: <Palette size={16} /> } : null,
  ].filter(Boolean) as NavTab[]
);

function resolveTabFromPath(pathname: string) {
  const exact = tabs.find((tab) => tab.url === pathname);
  if (exact) {
    return exact.url;
  }

  const nested = tabs.find((tab) => pathname.startsWith(`${tab.url}/`));
  return nested?.url ?? tabs[0].url;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeTab, setActiveTab] = useState(() => resolveTabFromPath(pathname));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAllRead,
    clearAll,
    handleSelect,
  } = useNotifications();

  const filterItems: FilterItem[] = useMemo(
    () =>
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        time: formatRelativeTime(n.createdAt),
        category: n.category,
        read: n.read,
      })),
    [notifications],
  );

  useEffect(() => {
    setActiveTab(resolveTabFromPath(pathname));
    const tab = resolveTabFromPath(pathname);
    localStorage.setItem(LAST_PAGE_STORAGE_KEY, tab);
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      const target = event.target as Node;
      if (!notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  const handleTabChange = (url: string) => {
    setActiveTab(url);
    if (pathname !== url) {
      navigate(url);
    }
  };

  const handleNotificationsToggle = () => {
    setNotificationsOpen((current) => !current);
  };

  const handleItemSelect = (item: FilterItem) => {
    const notification = notifications.find((n) => n.id === item.id);
    if (notification) {
      handleSelect(notification);
    }
    setNotificationsOpen(false);
  };

  return (
    <header className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6 lg:px-7 lg:pt-7">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between rounded-[20px] bg-[var(--surface-navbar)] px-3 py-2.5 sm:px-5 sm:py-3 shadow-[var(--shadow-inset-faint)]">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid size-10 place-items-center">
            <img src={kairosMark} alt="Kairos" className="size-8" />
          </div>
          <div className="min-w-0 max-w-full overflow-x-auto rounded-full bg-[var(--surface-pill)] p-1.5">
            <SlidingCapsuleNav
              tabs={tabs}
              currentTab={activeTab}
              onChange={handleTabChange}
              className="p-2"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full! border-[hsl(var(--border)/0.7)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] hover:border-[var(--surface-subtle)] text-[var(--ink-primary)]"
              onClick={handleNotificationsToggle}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  className="pointer-events-none absolute right-0 top-0 grid h-4 min-w-[1rem] -translate-y-1/4 translate-x-1/4 place-items-center rounded-full px-1 text-[10px] font-bold leading-none ring-2 ring-[var(--surface-navbar)]"
                  style={{
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-[75vh] overflow-auto rounded-2xl hover:border-[var(--surface-subtle)] bg-transparent p-1">
                <NotificationsFilter
                  items={filterItems}
                  sound={false}
                  unreadCount={unreadCount}
                  onItemSelect={handleItemSelect}
                  onMarkAllRead={markAllRead}
                  onClearAll={clearAll}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
