import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { trackVisibleViewport } from './lib/viewport';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

trackVisibleViewport();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
