import React, { useEffect, useRef, useState } from 'react'

export default function Player({ src, label, onPlayingChange, onLevelsChange }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const rafRef = useRef(null)
  const binsRef = useRef(12)

  useEffect(() => {
    const a = audioRef.current
    setPlaying(false)
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    onPlayingChange?.(false)
    // Tear down analyser for previous src
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    try {
      if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null }
      if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null }
    } catch (_) {}
    // Reset levels
    onLevelsChange?.(Array.from({ length: binsRef.current }, () => 0))
  }, [src])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause();
      setPlaying(false);
      onPlayingChange?.(false);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    } else {
      a.play();
      setPlaying(true);
      onPlayingChange?.(true);
      setupAnalyser();
      startMeterLoop();
    }
  }

  const setupAnalyser = () => {
    const a = audioRef.current
    if (!a) return
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    if (!sourceRef.current) sourceRef.current = ctx.createMediaElementSource(a)
    if (!analyserRef.current) analyserRef.current = ctx.createAnalyser()
    const analyser = analyserRef.current
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.85
    try {
      // Connect source to analyser and route to destination so audio is audible
      sourceRef.current.connect(analyser)
      analyser.connect(ctx.destination)
    } catch (_) {}
  }

  const startMeterLoop = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    const bins = binsRef.current
    const step = Math.floor(buf.length / bins)
    const loop = () => {
      analyser.getByteFrequencyData(buf)
      const levels = []
      for (let i = 0; i < bins; i++) {
        const start = i * step
        let sum = 0
        for (let j = start; j < Math.min(start + step, buf.length); j++) sum += buf[j]
        const avg = sum / step
        // Normalize 0..255 to 0.25..1.0 for a nice visual range
        const norm = Math.max(0.25, Math.min(1.0, avg / 170))
        levels.push(norm)
      }
      onLevelsChange?.(levels)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  return (
    <div className={`track-screen ${src ? 'generated' : ''}`} id="track-screen">
      <p className="track-text k-body" aria-live="polite">{label || 'Ready'}</p>
      <button className={`track-pp-btn ${playing ? 'playing' : ''}`} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'} onClick={toggle} disabled={!src}>
        <svg className="icon-play" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5l12 7-12 7V5z" fill="currentColor"></path>
        </svg>
        <svg className="icon-pause" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"></path>
        </svg>
      </button>
      <audio ref={audioRef} src={src} />
    </div>
  )
}