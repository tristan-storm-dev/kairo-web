import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const labs = [
  { key: 'house', name: 'House', cover: '/covers/house-cover.png', desc: 'warm grooves and modern rhythms.' },
  { key: 'techno', name: 'Techno', cover: '/covers/techno-cover.png', desc: 'relentless pulse and texture.' },
  { key: 'hiphop', name: 'Hip Hop', cover: '/covers/hiphop-cover.png', desc: 'head‑nod drums and sampling.' },
  { key: 'dnb', name: 'DnB', cover: '/covers/dnb-cover.png', desc: 'fast breaks and basslines.' },
  { key: 'ambient', name: 'Ambient', cover: '/covers/ambient-cover.png', desc: 'expansive pads and space.' }
]

export default function Labs() {
  useEffect(() => {
    document.body.classList.add('app-white')
    return () => { document.body.classList.remove('app-white') }
  }, [])

  return (
    <main className="app-frame" role="main" aria-label="Labs">
      <div className="top-bar" role="navigation" aria-label="Primary">
        <div className="bar-left">
          <div className="bar-title k-h2">kairo</div>
        </div>
        <div className="bar-right">
          <p className="text-black-teal">
            <Link to="/" className="brand-home-link" aria-label="Return to Home">
              <span className="bar-icon icon-star icon-rotate-45" aria-hidden="true"></span>
            </Link>
          </p>
        </div>
      </div>

      <div className="frame-media">
        <video
          className="frame-video"
          src="/home-video.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/covers/ambient-cover.png"
        ></video>
        <div className="media-overlay">
          <div className="overlay-card">
            <div className="overlay-title-row">
              <span className="inline-icon icon-star" aria-hidden="true"></span>
              <h2 className="k-h2 text-white">Explore Labs</h2>
            </div>
            <p className="hero-subtext text-white">each lab represents a genre. choose a lab to start cooking. lets turn your chaos into inspiration.</p>
          </div>
        </div>
      </div>

      <section className="lab-stage show" aria-label="Lab selection">
        <div className="lab-select-stage">
          <div className="lab-cards launched row-fill">
            {labs.map(l => (
              <Link key={l.key} className="lab-card" to={`/labs/${l.key}`} aria-label={`Go to ${l.name} Lab`}>
                <div className="card-cover">
                  <img src={l.cover} alt={`${l.name} Lab cover`} />
                </div>
                <div className="card-info">
                  <div className="lab-title-row">
                    <span className="inline-icon icon-star" aria-hidden="true"></span>
                    <div className="lab-card-title k-h2-sm">{l.name}</div>
                  </div>
                  <p className="lab-card-desc">{l.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}