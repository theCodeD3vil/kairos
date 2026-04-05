import { Bell, Home, LineChart, ReceiptText, Settings, CalendarDays, Gauge, Palette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AccountMenu, { type AccountMenuAction } from '@/components/ruixen/account-menu';
import { NotificationsFilter } from '@/components/ruixen/notifications-filter';
import { SlidingCapsuleNav, type NavTab } from '@/components/satisui/sliding-capsule-nav';
import { useToast } from '@/components/toast/ToastProvider';
import { Button } from '@/components/ui/button';

const showTheme = import.meta.env.DEV;

const tabs: NavTab[] = (
  [
    { title: 'Dashboard', url: '/overview', icon: <Home size={16} /> },
    { title: 'Analytics', url: '/activity', icon: <LineChart size={16} /> },
    { title: 'Reports', url: '/projects', icon: <ReceiptText size={16} /> },
    { title: 'Calendar', url: '/sessions', icon: <CalendarDays size={16} /> },
    { title: 'Languages', url: '/languages', icon: <Gauge size={16} /> },
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
  const { info, success, error } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeTab, setActiveTab] = useState(() => resolveTabFromPath(pathname));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(resolveTabFromPath(pathname));
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

  const handleAccountAction = (action: AccountMenuAction) => {
    if (action === 'logout') {
      error('Sign Out', 'You have been signed out.');
      return;
    }

    const labels: Record<AccountMenuAction, string> = {
      dashboard: 'Dashboard selected',
      'team-space': 'Team Space selected',
      settings: 'Settings selected',
      'theme-light': 'Theme set to Light',
      'theme-dark': 'Theme set to Dark',
      'theme-system': 'Theme set to System',
      'notification-email': 'Email alerts preference updated',
      'notification-push': 'Push alerts preference updated',
      'notification-sms': 'SMS alerts preference updated',
      logout: 'Signed out',
    };

    info('Account', labels[action]);
  };

  return (
    <header className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6 lg:px-7 lg:pt-7">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between rounded-[20px] bg-[var(--surface-navbar)] px-3 py-2.5 sm:px-5 sm:py-3 shadow-[var(--shadow-inset-faint)]">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--surface-accent)] text-[var(--ink-accent-strong)]">
            <div className="grid grid-cols-2 gap-1">
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
            </div>
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

        <div className="ml-2 flex shrink-0 items-center gap-2">
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
          <AccountMenu onAction={handleAccountAction} />
        </div>
      </div>
    </header>
  );
}
