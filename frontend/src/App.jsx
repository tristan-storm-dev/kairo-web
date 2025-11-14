import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Labs from './pages/Labs.jsx'
import Lab from './pages/Lab.jsx'

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/labs/:genre" element={<Lab />} />
      </Routes>
    </div>
  )
}