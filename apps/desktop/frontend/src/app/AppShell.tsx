import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';

export function AppShell() {
  return (
    <div className="h-full bg-[#eceeee] text-[#1e2428]">
      <div className="flex h-full flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
