import './telemetry/setup'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SnackbarProvider } from './components/common'
import { reportError } from './telemetry'

createRoot(document.getElementById('root')!, {
  // Replaces React's default, which only logs to the console.
  onUncaughtError: (error, errorInfo) => {
    console.error('Uncaught React error:', error, errorInfo.componentStack)
    reportError('Uncaught React error', error, { 'react.component_stack': errorInfo.componentStack })
  },
}).render(
  <StrictMode>
    <SnackbarProvider>
      <App />
    </SnackbarProvider>
  </StrictMode>,
)
