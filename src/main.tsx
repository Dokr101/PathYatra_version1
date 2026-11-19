import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import App from './App'
import { AppProvider } from './context/AppContext'
import './index.css'

// Built-in error reporting for the SPA. Without VITE_SENTRY_DSN at build time
// nothing is initialised, so local builds stay offline and send no events.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim()
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    // Sentry 11 collects data per category; keep cookies, headers, bodies,
    // query strings and identity out of browser events.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
