import { Bell, ChevronDown, Home, LineChart, ReceiptText, Settings, CalendarDays, Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SlidingCapsuleNav, type NavTab } from '@/components/satisui/sliding-capsule-nav';
import { Button } from '@/components/ui/button';

const tabs: NavTab[] = [
  { title: 'Dashboard', url: '/overview', icon: <Home size={16} /> },
  { title: 'Analytics', url: '/activity', icon: <LineChart size={16} /> },
  { title: 'Reports', url: '/projects', icon: <ReceiptText size={16} /> },
  { title: 'Calendar', url: '/sessions', icon: <CalendarDays size={16} /> },
  { title: 'Languages', url: '/languages', icon: <Gauge size={16} /> },
  { title: 'Settings', url: '/settings', icon: <Settings size={16} /> },
];

function resolveTabFromPath(pathname: string) {
  const exact = tabs.find((tab) => tab.url === pathname);
  if (exact) {
    return exact.url;
  }

  const nested = tabs.find((tab) => pathname.startsWith(`${tab.url}/`));
  return nested?.url ?? tabs[0].url;
}

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeTab, setActiveTab] = useState(() => resolveTabFromPath(pathname));

  useEffect(() => {
    setActiveTab(resolveTabFromPath(pathname));
  }, [pathname]);

  const handleTabChange = (url: string) => {
    setActiveTab(url);
    if (pathname !== url) {
      navigate(url);
    }
  };

  return (
    <header className="px-7 pb-4 pt-7">
      <div className="flex items-center justify-between rounded-[20px] bg-[#f4f6f5] px-5 py-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-[#cde367] text-[#1e3f44]">
            <div className="grid grid-cols-2 gap-1">
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-full bg-[#e7ebea] p-1.5">
            <SlidingCapsuleNav
              tabs={tabs}
              currentTab={activeTab}
              onChange={handleTabChange}
              className="p-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full border-black/10 bg-white text-[#2d3b40]">
            <Bell size={16} />
          </Button>
          <Button variant="outline" className="h-10 rounded-full border-black/10 bg-white px-2 text-[#2d3b40]">
            <span className="grid size-8 place-items-center rounded-full bg-[#2e63be] text-xs font-semibold text-white">NA</span>
            <ChevronDown size={14} />
          </Button>
        </div>
      </div>
    </header>
  );
}
