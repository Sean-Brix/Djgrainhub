import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Captures the browser's beforeinstallprompt event so we can trigger the
 * PWA install dialog from anywhere in the UI.
 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already running as a standalone PWA
    const mql = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mql.addEventListener('change', onChange);

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setPromptEvent(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      mql.removeEventListener('change', onChange);
    };
  }, []);

  const triggerInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setPromptEvent(null);
  };

  return { canInstall: !!promptEvent && !isInstalled, isInstalled, triggerInstall };
}
