import { toast, type ExternalToast } from 'sonner';
import { WEBI } from '@/design-system/webi/webi.config';
import { setWebiMood } from '@/design-system/webi/useWebi';
import { webiApp } from '@/design-system/webi/appBridge';

/**
 * App messages. When Webi is on (app mode, desktop), short success/info
 * messages without a button are said in his bubble — happy mood, ~2.5 s each,
 * at most 3 queued (the rest become toasts). Everything else — errors, long
 * text, anything with an action (Undo, Try again) — stays a normal toast.
 */
const AP = WEBI.app;
const queue: string[] = [];
let busy = false;

function next() {
  const line = queue.shift();
  if (line === undefined) { busy = false; return; }
  busy = true;
  setWebiMood('happy', AP.sayMs, line);
  window.setTimeout(next, AP.sayMs + 150);
}

function viaWebi(message: string, opts?: ExternalToast): boolean {
  if (!webiApp.isActive()) return false;
  if (opts?.action || opts?.cancel || opts?.description) return false;
  if (message.length > AP.maxChars) return false;
  if (queue.length + (busy ? 1 : 0) >= AP.queueMax) return false;
  queue.push(message);
  if (!busy) next();
  return true;
}

export const notify = {
  success(message: string, opts?: ExternalToast) { if (!viaWebi(message, opts)) toast.success(message, opts); },
  info(message: string, opts?: ExternalToast) { if (!viaWebi(message, opts)) toast.info(message, opts); },
  /** errors are always toasts, so they can't be missed */
  error(message: string, opts?: ExternalToast) { toast.error(message, opts); },
};
