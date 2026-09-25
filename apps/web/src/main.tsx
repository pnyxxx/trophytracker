import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Polices auto-hébergées (aucune requête vers Google Fonts : voir la CSP du Caddyfile).
import '@fontsource/archivo/latin-400';
import '@fontsource/archivo/latin-500';
import '@fontsource/archivo/latin-600';
import '@fontsource/archivo/latin-700';
import '@fontsource/big-shoulders-display/latin-600';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/big-shoulders-display/latin-900';
import '@fontsource/big-shoulders-stencil-display/latin-800';
import '@fontsource/big-shoulders-stencil-display/latin-900';
import '@fontsource/jetbrains-mono/latin-400';
import '@fontsource/jetbrains-mono/latin-600';
import '@fontsource/jetbrains-mono/latin-700';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
