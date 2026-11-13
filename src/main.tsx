import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (Fontsource): Geist + Geist Mono + Instrument Serif for the
// Genie redesign; Bricolage Grotesque + Figtree only for the frozen Project Stack.
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/figtree';
import App from './App.tsx';
import './index.css';
import './design-system/styles/pages.css';
import './design-system/styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
