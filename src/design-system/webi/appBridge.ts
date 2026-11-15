/**
 * Whether the app-mode Webi is on screen right now (set by <Webi variant="app" />
 * while mounted). notify() reads it to decide between Webi's bubble and a toast.
 */
let active = false;
export const webiApp = {
  isActive: () => active,
  setActive: (on: boolean) => { active = on; },
};
