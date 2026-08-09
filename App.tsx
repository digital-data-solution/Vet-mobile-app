import React, { useEffect, useState } from 'react';
import './src/i18n'; // initialise i18n (device locale + saved preference) before render
import AppNavigator from './src/navigation';
import { loadCurrency } from './src/utils/money';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate the cached currency symbol so amounts render correctly on first paint.
    loadCurrency().finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <AppNavigator />;
}
