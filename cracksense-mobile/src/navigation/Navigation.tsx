import React from 'react';
import { AppNavigator, navigationRef } from './AppNavigator';

export const Navigation: React.FC = () => {
  return <AppNavigator />;
};

export { AppNavigator, navigationRef };
export default Navigation;
