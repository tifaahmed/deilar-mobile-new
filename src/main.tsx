import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { navigate } from './router';
// The app's font ships inside the app: no round trip to Google Fonts before the first paint.
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-800.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import '@fontsource/cairo/latin-800.css';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { installKeyboardGuard } from './utils/keyboardGuard';

// Any field being typed in is scrolled clear of the on-screen keyboard (one rule for every form).
installKeyboardGuard();

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

// Android back button: step back through the app's own pages; leave the app only from the first one.
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('backButton', () => {
    if (window.history.length > 1 && location.pathname !== '/') window.history.back();
    else if (location.pathname !== '/') navigate('/', { replace: true });
    else CapacitorApp.exitApp();
  });
}
