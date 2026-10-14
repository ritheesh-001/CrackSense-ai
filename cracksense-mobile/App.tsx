import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { Navigation } from './src/navigation/Navigation';
import { initializeInsForgeSession } from './src/services/insforge';
import { initOfflineDb } from './src/services/offlineDb';

// Keep the splash screen visible while we initialize resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen auto-hide prevention notice
});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepareApp() {
      try {
        // Startup initialization tasks: InsForge session check & SQLite offlineDb init
        const startupTask = Promise.allSettled([
          initOfflineDb(),
          initializeInsForgeSession()
        ]);

        // Maximum 2-second timeout guard
        const timeoutTask = new Promise((resolve) => setTimeout(resolve, 2000));

        await Promise.race([startupTask, timeoutTask]);
      } catch (err) {
        console.warn('Startup initialization error:', err);
      } finally {
        if (isMounted) {
          setAppIsReady(true);
        }
        // ALWAYS call SplashScreen.hideAsync() inside finally block so it never freezes
        try {
          await SplashScreen.hideAsync();
        } catch (splashErr) {
          // Ignore if already hidden or unsupported platform
        }
      }
    }

    prepareApp();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
