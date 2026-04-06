import { createContext, useContext, useEffect, useState } from 'react';

export const APP_POLL_INTERVAL_MS = 10_000;

type AppPollingContextValue = {
  tick: number;
};

const AppPollingContext = createContext<AppPollingContextValue>({
  tick: 0,
});

type AppPollingProviderProps = {
  children: React.ReactNode;
};

export function AppPollingProvider({
  children,
}: AppPollingProviderProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((current) => current + 1);
    }, APP_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <AppPollingContext.Provider value={{ tick }}>
      {children}
    </AppPollingContext.Provider>
  );
}

export function useAppPolling() {
  return useContext(AppPollingContext);
}
