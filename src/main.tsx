import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/msalInstance';
import './index.css'
import App from './App'
import { ClientProvider } from './features/clients/ClientContext';
import { EnvironmentProvider } from './contexts/EnvironmentContext';

// Default to using the first account if no account is active on page load
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
  // Account selection logic is app dependent. Adjust as needed.
  msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

// Listen for sign-in event and set active account
msalInstance.initialize().then(() => {
  // Account selection logic is app dependent. Adjust as needed.
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  msalInstance.addEventCallback((event: any) => {
    if (event.eventType === "msal:loginSuccess" && event.payload.account) {
      const account = event.payload.account;
      msalInstance.setActiveAccount(account);
    }
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <EnvironmentProvider>
          <ClientProvider>
            <App />
          </ClientProvider>
        </EnvironmentProvider>
      </MsalProvider>
    </StrictMode>,
  )
});
