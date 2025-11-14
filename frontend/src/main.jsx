import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

// Import CSS from local styles directory
import './styles/base.css'
import './styles/home.css'
import './styles/labs.css'
import './styles/house.css'
import './styles/ambient.css'
import './styles/hiphop.css'
import './styles/techno.css'
import './styles/dnb.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)