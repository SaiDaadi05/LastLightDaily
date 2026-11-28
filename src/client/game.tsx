import './fonts';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { fetchInit } from './community/api';

const root = createRoot(document.getElementById('root')!);

// Load this post's night first, so the right sky opens straight away.
void fetchInit().then((init) =>
  root.render(
    <StrictMode>
      <App init={init} />
    </StrictMode>
  )
);
