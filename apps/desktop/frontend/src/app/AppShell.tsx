import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';

export function AppShell() {
  return (
    <div className="h-full bg-[#eceeee] text-[#1e2428]">
      <div className="flex h-full flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-auto px-7 pb-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
