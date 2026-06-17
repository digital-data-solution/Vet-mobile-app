import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    Platform.OS === 'web'
      ? (typeof navigator !== 'undefined' ? navigator.onLine : true)
      : true,
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline  = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online',  handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online',  handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Native: lightweight ping every 15 s
    let active = true;
    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        await fetch('https://www.google.com/generate_204', { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(timer);
        if (active) setIsOnline(true);
      } catch {
        if (active) setIsOnline(false);
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return isOnline;
}
