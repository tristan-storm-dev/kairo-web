import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  useEffect(() => {
    document.body.classList.add('app-white')
    return () => { document.body.classList.remove('app-white') }
  }, [])

  return (
    <main className="app-frame" role="main" aria-label="Home">
      <div className="top-bar" role="navigation" aria-label="Primary">
        <div className="bar-left">
          <Link to="/" className="brand-title-link" aria-label="Kairo Home">
            <div className="bar-title k-h2">kairo</div>
          </Link>
        </div>
        <div className="bar-right">
          <p className="text-black-teal">
            <Link to="/labs" className="brand-labs-link" aria-label="Open Labs">
              <span className="bar-icon icon-star" aria-hidden="true"></span>
            </Link>
          </p>
        </div>
      </div>
      <div className="frame-media">
        <video className="frame-video" src="/home-video.mp4" autoPlay loop muted playsInline preload="metadata" poster="/covers/ambient-cover.png" onError={(e) => { e.currentTarget.style.display = 'none' }}></video>
        <div className="media-overlay">
          <div className="overlay-card">
            <div className="overlay-title-row">
              <span className="inline-icon icon-star" aria-hidden="true"></span>
              <h2 className="k-h2 text-white overlay-title">Welcome to Kairo</h2>
            </div>
            <p>turn chaos into sound, kairo helps artists overcome their creative blocks by giving them a platform to visualize their ideas and turn them into music using ai.</p>
            <Link className="primary-btn cta-explore" to="/labs" aria-label="Go to Labs"><span className="cta-label">Explore Labs</span></Link>
          </div>
        </div>
      </div>
    </main>
  )
}