import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  ROUTE_TRANSITION_DURATION_MS,
  ROUTE_TRANSITION_READY_DELAY_MS,
  RouteTransitionProvider,
} from '@/app/RouteTransitionContext';
import { Navbar } from '@/components/layout/Navbar';

export function AppShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setRouteReady(true);
      return;
    }

    setRouteReady(false);

    const timer = window.setTimeout(() => {
      setRouteReady(true);
    }, ROUTE_TRANSITION_READY_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.pathname, reduceMotion]);

  return (
    <div className="h-full bg-[var(--surface-shell)] text-[var(--ink-strong-alt)]">
      <div className="flex h-full flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7">
          <div className="mx-auto w-full max-w-[1440px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, filter: 'blur(6px)' }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{
                  duration: reduceMotion ? 0 : ROUTE_TRANSITION_DURATION_MS / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="min-h-full will-change-transform"
              >
                <RouteTransitionProvider ready={routeReady}>
                  <Outlet />
                </RouteTransitionProvider>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
