import { createContext, useContext } from 'react';

const NavigationContext = createContext({
  navigationOpen: false,
  toggleNavigation: () => {},
  closeNavigation: () => {},
});

export const NavigationProvider = NavigationContext.Provider;
export const useNavigation = () => useContext(NavigationContext);
