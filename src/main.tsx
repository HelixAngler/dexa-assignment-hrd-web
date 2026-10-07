import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './i18n/provider';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      {/* The SPA is served under the /hrd URL prefix, so the router strips that
          prefix before matching any of the application routes. */}
      <BrowserRouter basename="/hrd">
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
