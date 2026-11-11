import type { GuideStep } from '../types';

/**
 * Turns the composer's "Write it" free-text into guide steps. Deliberately
 * isolated behind this one function (per the spec) so it can be swapped for
 * an AI-backed parser later without touching the composer UI.
 *
 * Rule: a line starting with `$` becomes a terminal step (the command is the
 * line with `$ ` stripped). Any other non-empty line is held as a pending
 * "tip" — attached as a `tip` step the next time a `$` line appears (using it
 * as that terminal step's title), or flushed as its own trailing tip step if
 * the text doesn't end on a command.
 */
export function parseWriteIt(text: string): GuideStep[] {
  const steps: GuideStep[] = [];
  let pendingTip: string | null = null;

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  for (const line of lines) {
    if (line.startsWith('$')) {
      const cmd = line.slice(1).trim();
      const title = pendingTip ?? 'Run this';
      steps.push({ type: 'terminal', title, cmd, out: ['✓ done'] });
      pendingTip = null;
    } else {
      pendingTip = line.replace(/:\s*$/, '');
    }
  }

  if (pendingTip) {
    steps.push({ type: 'tip', title: pendingTip, text: pendingTip });
  }

  return steps;
}
