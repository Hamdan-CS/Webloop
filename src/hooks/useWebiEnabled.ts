import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WEBI } from '@/design-system/webi/webi.config';

const EVT = 'webi:app-enabled';
const keyFor = (uid: string) => `${WEBI.app.storageKey}_${uid}`;
const read = (uid: string | undefined) => {
  if (!uid) return false;
  try { return localStorage.getItem(keyFor(uid)) === '1'; } catch { return false; }
};

/** Webi in the app: on/off per user, saved in this browser (off for new users). */
export function useWebiEnabled(): [boolean, (on: boolean) => void] {
  const { user } = useAuth();
  const uid = user?.id;
  const [on, setOn] = useState(() => read(uid));
  useEffect(() => {
    setOn(read(uid));
    const sync = () => setOn(read(uid));
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, [uid]);
  const set = useCallback((next: boolean) => {
    if (!uid) return;
    try { if (next) localStorage.setItem(keyFor(uid), '1'); else localStorage.removeItem(keyFor(uid)); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event(EVT));
  }, [uid]);
  return [on, set];
}

const DESKTOP = '(min-width: 860px)'; // the app's sidebar breakpoint; phones keep toasts and no walking Webi

/** True where the app shows its sidebar (Webi can walk there). */
export function useAppDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => matchMedia(DESKTOP).matches);
  useEffect(() => {
    const mq = matchMedia(DESKTOP);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}
