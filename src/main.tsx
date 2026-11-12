import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { App } from '@/app/App';

// After a deploy, a tab opened earlier still points at the previous build's
// hashed chunks. They are gone, so the host answers with index.html instead and
// the browser refuses it ("Expected a JavaScript module… MIME type text/html").
// Reload once to pick up the new build — at most once every 10 s, so a chunk
// that is genuinely missing can't loop.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const last = Number(sessionStorage.getItem('chunk-reload-at') ?? 0);
  if (Date.now() - last < 10_000) return;
  sessionStorage.setItem('chunk-reload-at', String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
