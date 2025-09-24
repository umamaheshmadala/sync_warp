import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import debug utilities for development
import './utils/testCouponCreation'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily disabled React.StrictMode to test auto-reload issues
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)
