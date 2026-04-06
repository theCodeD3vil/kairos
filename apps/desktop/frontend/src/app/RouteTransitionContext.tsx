import { createContext, useContext } from 'react';

export const ROUTE_TRANSITION_DURATION_MS = 240;
export const ROUTE_TRANSITION_BUFFER_MS = 60;
export const ROUTE_TRANSITION_READY_DELAY_MS =
  ROUTE_TRANSITION_DURATION_MS + ROUTE_TRANSITION_BUFFER_MS;

const RouteTransitionReadyContext = createContext<boolean>(true);

type RouteTransitionProviderProps = {
  children: React.ReactNode;
  ready: boolean;
};

export function RouteTransitionProvider({
  children,
  ready,
}: RouteTransitionProviderProps) {
  return (
    <RouteTransitionReadyContext.Provider value={ready}>
      {children}
    </RouteTransitionReadyContext.Provider>
  );
}

export function useRouteTransitionReady() {
  return useContext(RouteTransitionReadyContext);
}
