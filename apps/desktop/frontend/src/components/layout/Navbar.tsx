import { Bell, Home, LineChart, Settings, CalendarDays, Palette, CalendarRange } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationsFilter } from '@/components/ruixen/notifications-filter';
import { SlidingCapsuleNav, type NavTab } from '@/components/satisui/sliding-capsule-nav';
import { useToast } from '@/components/toast/ToastProvider';
import { Button } from '@/components/ui/button';
import kairosMark from '@/assets/kairos-mark.svg';
import { LAST_PAGE_STORAGE_KEY } from '@/lib/settings/preferences';

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

export function Navbar() {
  const { info, success } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeTab, setActiveTab] = useState(() => resolveTabFromPath(pathname));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

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
    setNotificationsOpen((current) => {
      const next = !current;
      if (next) {
        info('Notifications', 'Opened your notifications center.');
      }
      return next;
    });
  };

  const handleCategoryChange = (category: string) => {
    info('Notification Filter', `Showing ${category} notifications.`);
  };

  const handleNotificationSelect = (title: string) => {
    success('Notification Opened', title);
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
              className="rounded-full! border-black/10 bg-white hover:bg-[var(--surface-subtle)] hover:border-[var(--surface-subtle)] text-[var(--ink-primary)]"
              onClick={handleNotificationsToggle}
            >
              <Bell size={16} />
            </Button>
            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-[75vh] overflow-auto rounded-2xl hover:border-[var(--surface-subtle)] bg-transparent p-1">
                <NotificationsFilter
                  sound={false}
                  onCategoryChange={handleCategoryChange}
                  onItemSelect={(item) => handleNotificationSelect(item.title)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
