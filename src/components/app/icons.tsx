/** The demo's workspace icons (IC), 24×24 stroke paths; styled by app-shell.css. */
const IC = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  proj: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="M3.5 9.5h17" /></>,
  expl: <><circle cx="12" cy="12" r="8" /><path d="m15 9-2 4.5L8.5 15l2-4.5z" /></>,
  msg: <path d="M5 6h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />,
  feed: <><rect x="4" y="4" width="16" height="7" rx="2.5" /><rect x="4" y="13" width="16" height="7" rx="2.5" /></>,
  port: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  side: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  tab: <><rect x="3.5" y="6" width="17" height="13" rx="3" /><path d="M3.5 10h7V6" /></>,
  close: <path d="M7 7l10 10M17 7 7 17" />,
  spark: <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  list: <path d="M5 6h14M5 12h14M5 18h14" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
} as const;
export type IconName = keyof typeof IC;

export function WIcon({ name, size }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" data-ic={name} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {IC[name]}
    </svg>
  );
}
