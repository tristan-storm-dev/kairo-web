import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Canvas from '../components/Canvas.jsx'
import Player from '../components/Player.jsx'
import { buildPrompt, genreVocab, genreSynonyms } from '../lib/prompt.js'
import { analyzeDrawing, generateMusic } from '../lib/apiClient.js'

const GENRES = {
  techno: 'Techno',
  house: 'House',
  hiphop: 'Hip Hop',
  ambient: 'Ambient',
  dnb: 'Drum & Bass'
}

export default function Lab() {
  const { genre } = useParams()
  const genreName = useMemo(() => GENRES[genre] || 'House', [genre])

  const [styleCanvasEl, setStyleCanvasEl] = useState(null)
  const [vibeCanvasEl, setVibeCanvasEl] = useState(null)
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [selectedVibe, setSelectedVibe] = useState(null)
  const [styleColor, setStyleColor] = useState('#ffffff')
  const [vibeColor, setVibeColor] = useState('#ffffff')
  const [layer, setLayer] = useState('Slow')
  const [generateStatus, setGenerateStatus] = useState('Ready')
  const [vibeStatus, setVibeStatus] = useState('Ready')
  const [styleStatus, setStyleStatus] = useState('Ready')
  const [audioSrc, setAudioSrc] = useState(null)
  const [isAnalyzingVibe, setIsAnalyzingVibe] = useState(false)
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [vuLevels, setVuLevels] = useState(Array.from({ length: 12 }, () => 0))

  const vocab = genreVocab[genreName] || { vibe: [], style: [] }

  const getCanvasBase64 = (canvas) => canvas.toDataURL('image/png').split(',')[1]

  const handleAnalyze = async (which) => {
    const canvas = which === 'style' ? styleCanvasEl : vibeCanvasEl
    if (!canvas) return
    if (which === 'style') { if (isAnalyzingStyle) return; setIsAnalyzingStyle(true); setStyleStatus('Analyzing') }
    else { if (isAnalyzingVibe) return; setIsAnalyzingVibe(true); setVibeStatus('Analyzing') }
    try {
      const data = await analyzeDrawing(getCanvasBase64(canvas), which)
      const raw = data.promptResult
      const synonyms = (genreSynonyms[genreName] || {})
      if (which === 'style') {
        const normalized = normalize(raw, vocab.style, synonyms.style)
        setSelectedStyle(normalized)
        setStyleStatus('Ready')
      } else {
        const normalized = normalize(raw, vocab.vibe, synonyms.vibe)
        setSelectedVibe(normalized)
        setVibeStatus('Ready')
      }
      setGenerateStatus('Ready to generate!')
    } catch (e) {
      if (which === 'style') setStyleStatus(`Error: ${e.message}`)
      else setVibeStatus(`Error: ${e.message}`)
    }
    finally {
      if (which === 'style') setIsAnalyzingStyle(false)
      else setIsAnalyzingVibe(false)
    }
  }

  const normalize = (raw, allowed, synonymsMap = {}) => {
    // Inline normalization mirrors lib/prompt.normalizeKeyword to avoid extra import
    const fallback = allowed && allowed.length ? allowed[0] : ''
    if (!raw) return fallback
    const t = raw.toString().toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean)
    for (const w of t) { if (allowed.includes(w)) return w }
    for (const w of t) { const m = synonymsMap[w]; if (m && allowed.includes(m)) return m }
    const keys = Object.keys(synonymsMap)
    for (const key of keys) {
      for (const w of t) {
        if (w.includes(key) || key.includes(w)) { const m = synonymsMap[key]; if (m && allowed.includes(m)) return m }
      }
    }
    let best = fallback, score = 0
    for (const a of allowed) {
      for (const w of t) {
        if (w.startsWith(a) || a.startsWith(w) || w.includes(a) || a.includes(w)) {
          const s = Math.min(w.length, a.length)
          if (s > score) { score = s; best = a }
        }
      }
    }
    return best
  }

  const handleGenerate = async () => {
    if (!selectedStyle || !selectedVibe) { setGenerateStatus('Complete analysis for style and vibe.'); return }
    const promptText = buildPrompt(genreName, selectedVibe, selectedStyle, layer)
    setGenerateStatus('Generating...')
    try {
      const data = await generateMusic(promptText)
      if (!data.audioBase64) throw new Error('Server response did not include audio data.')
      const src = `data:audio/wav;base64,${data.audioBase64}`
      setAudioSrc(src)
      setGenerateStatus(`Generation complete — press play`)
    } catch (e) {
      setGenerateStatus(`Error: ${e.message}`)
    }
  }

  const handleAnalyzeAndGenerate = async () => {
    try {
      if (!selectedVibe) await handleAnalyze('vibe')
      if (!selectedStyle) await handleAnalyze('style')
    } catch (_) {
      // Deck-specific status already set in handleAnalyze
      return
    }
    await handleGenerate()
  }

  useEffect(() => {
    document.body.classList.add('app-white')
    return () => { document.body.classList.remove('app-white') }
  }, [])

  // Fit the DJ board to the available frame like original script.js
  const frameRef = useRef(null)
  const boardRef = useRef(null)
  useEffect(() => {
    const frame = frameRef.current
    const board = boardRef.current
    if (!frame || !board) return
    const getPx = (v) => {
      if (!v) return 0
      const n = parseFloat(v.toString())
      return isNaN(n) ? 0 : n
    }
    const computeScale = () => {
      const styles = getComputedStyle(board)
      const baseW = getPx(styles.getPropertyValue('--board-w')) || board.offsetWidth
      const baseH = getPx(styles.getPropertyValue('--board-h')) || board.offsetHeight
      const availW = frame.clientWidth
      const availH = frame.clientHeight
      const s = Math.min(availW / baseW, availH / baseH)
      board.style.setProperty('--board-scale', s)
    }
    computeScale()
    const ro = new ResizeObserver(() => computeScale())
    ro.observe(frame)
    const onResize = () => computeScale()
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const coverSrc = `/covers/${genre === 'dnb' ? 'dnb' : genre}-cover.png`

  const padColors = ['#ffffff','#ff3b3b','#ff873c','#ffea3c','#00e060','#3cf2ff','#3c78ff','#ff3cf3']

  const resetCanvas = (which) => {
    const c = which === 'style' ? styleCanvasEl : vibeCanvasEl
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    if (which === 'style') { setStyleStatus('Ready'); setSelectedStyle(null) }
    else { setVibeStatus('Ready'); setSelectedVibe(null) }
  }

  return (
    <main className="app-frame" role="main" aria-label={`${genreName} Lab`}>
      <style>{`
        html, body { height: 100%; overflow: hidden; }
        .screen.full-deck { padding: 0; position: static; background: transparent !important; }
        .screen.full-deck .container { padding: 0; min-height: 100vh; background: transparent !important; display: block; box-sizing: border-box; overflow: hidden; }
        .deck-container-root { display: block; min-height: 100vh; }
        .deck-top { margin-bottom: 0; height: auto !important; overflow: hidden; flex: 0 0 auto; background: transparent; border: none; box-shadow: none; padding: 0; box-sizing: border-box; }
        .top-center { height: auto; }
        .top-center .track-view, .track-screen { height: 56px !important; min-height: 56px !important; }
        /* Ensure mixer panels are visible across screen sizes in Lab */
        .frame-media .mixer-panel { display: flex !important; }
        @media (max-width: 900px) {
          .top-center .track-view, .track-screen { height: 52px !important; min-height: 52px !important; }
        }
        /* Spinning animation for platters while playing */
        @keyframes disk-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .platter .lab-canvas.spinning { animation: disk-spin 3.2s linear infinite; transform-origin: 50% 50%; }

        /* VU LED bars animation */
        .frame-media .mixer-panel .vu-bars { position: relative; display: grid; grid-template-columns: repeat(12, 1fr); align-items: end; gap: 6px; padding: 10% 8px; background: linear-gradient(180deg, #0a0a0a 0%, #121212 100%); }
        .frame-media .mixer-panel .vu-bars .bar { display: block; width: 100%; height: 20%; background: linear-gradient(180deg, #20ffa0 0%, #09e061 100%); box-shadow: 0 0 12px rgba(32,255,160,0.35); border-radius: 4px; opacity: 0.25; transform-origin: bottom; transform: scaleY(0.3); }
        @keyframes vu-bounce { 0% { transform: scaleY(0.25); opacity: 0.35; } 50% { transform: scaleY(1.0); opacity: 0.95; } 100% { transform: scaleY(0.25); opacity: 0.35; } }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar { animation: vu-bounce 0.9s ease-in-out infinite; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b1 { animation-delay: 0.00s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b2 { animation-delay: 0.05s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b3 { animation-delay: 0.10s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b4 { animation-delay: 0.15s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b5 { animation-delay: 0.20s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b6 { animation-delay: 0.25s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b7 { animation-delay: 0.30s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b8 { animation-delay: 0.35s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b9 { animation-delay: 0.40s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b10 { animation-delay: 0.45s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b11 { animation-delay: 0.50s; }
        .frame-media .mixer-panel .vu-bars.playing:not(.reactive) .bar.b12 { animation-delay: 0.55s; }
      `}</style>
      <div className="top-bar" role="navigation" aria-label={`${genreName} Lab Header`}>
        <div className="bar-left">
          <div className="cover-box">
            <img src={coverSrc} alt={`${genreName} Lab cover`} />
          </div>
          <div className="lab-details">
            <h2 className="k-h2 lab-title">{genreName} Lab</h2>
          </div>
        </div>
        <div className="bar-center">
          <div className="track-view" id="track-view" style={{ width:'100%', maxWidth:'720px' }}>
            <Player src={audioSrc} label={generateStatus} onPlayingChange={setIsPlaying} onLevelsChange={setVuLevels} />
          </div>
        </div>
        <div className="bar-right">
          <Link className="primary-btn cta-explore" to="/" aria-label="Go to Home"><span className="cta-label">home</span></Link>
          <Link className="primary-btn cta-explore" to="/labs" aria-label="Go to Labs"><span className="cta-label">labs</span></Link>
          <button className="primary-btn cta-explore" disabled={!audioSrc} onClick={() => { if (!audioSrc) return; const a = document.createElement('a'); a.href = audioSrc; a.download = 'kairo-track.wav'; a.click() }} aria-label="Download Track"><span className="cta-label">download</span></button>
          <button className="primary-btn cta-explore" onClick={() => alert('Draw on each deck, analyze, then generate!')} aria-label="Help"><span className="cta-label">help</span></button>
        </div>
      </div>

      <div className="frame-media">
        <div className="board-frame" ref={frameRef}>
          <div className="dj-board" ref={boardRef}>
            <div className="dj-decks">
              <div className="deck-container deck-left">
                <div className="deck-header-line">
                  <h2 className="deck-title">Vibe Deck</h2>
                  <button className="icon-btn help-btn" title="Help" aria-label="Help">?</button>
                </div>
                <div className="platter">
                  <Canvas size={420} onReady={setVibeCanvasEl} onChange={() => handleAnalyze('vibe')} color={vibeColor} className={`lab-canvas ${isPlaying ? 'spinning' : ''}`} />
                </div>
                <div className="deck-result" aria-live="polite" style={{ marginTop: '10px', textAlign: 'center' }}>
                  <div className="prompt-label">Vibe</div>
                  <div className="prompt-value" id="display-vibe-inline">{selectedVibe || '?'}</div>
                </div>
                <div className="pad-grid" aria-label="Vibe deck color pads">
                  {padColors.map((c) => (
                    <button key={c} className="pad" style={{ '--pad-color': c }} onClick={() => setVibeColor(c)} aria-label={c}></button>
                  ))}
                </div>
                <div className="deck-controls">
                  <button className="icon-btn reset-btn" title="Delete drawing" aria-label="Delete drawing" onClick={() => resetCanvas('vibe')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 14h10l1-14" />
                      <path d="M10 10v8" />
                      <path d="M14 10v8" />
                    </svg>
                  </button>
                  <div className={`deck-status ${vibeStatus === 'Ready' ? 'status-ready' : ''}`} id="vibe-status">{vibeStatus}</div>
                </div>
              </div>

              <div className="mixer-panel panel-left" aria-label="Left volume panel">
                <div className={`vu-bars reactive ${isPlaying ? 'playing' : ''}`} aria-hidden="true">
                  {vuLevels.map((lvl, i) => (
                    <div key={i} className={`bar b${i+1}`} style={{ transform: `scaleY(${lvl})`, opacity: Math.max(0.35, lvl) }}></div>
                  ))}
                </div>
              </div>

              <div className="mixer-center">
                <div className="mixer">
                  <div className="meter left" aria-hidden="true"></div>
                  <div className="faders">
                    <div className="fader"></div>
                    <div className="fader"></div>
                    <div className="fader cross"></div>
                  </div>
                  <div className="center-controls">
                    <div className="switch-row">
                      <div role="tablist" aria-label="Layer switch" id="layer-switch">
                        <button className={`layer-btn ${layer === 'Slow' ? 'active' : ''}`} aria-selected={layer==='Slow'} onClick={() => setLayer('Slow')}>Slow</button>
                        <button className={`layer-btn ${layer === 'Fast' ? 'active' : ''}`} aria-selected={layer==='Fast'} onClick={() => setLayer('Fast')}>Fast</button>
                      </div>
                    </div>
                    <div className="prompt-stack">
                      <div className="prompt-bar vibe">
                        <div className="prompt-label">Vibe Deck</div>
                        <div className="prompt-value" id="display-vibe">{selectedVibe || '?'}</div>
                      </div>
                      <div className="prompt-bar style">
                        <div className="prompt-label">Style Deck</div>
                        <div className="prompt-value" id="display-style">{selectedStyle || '?'}</div>
                      </div>
                    </div>
                    <div className="control-decor" aria-hidden="true">
                      <div className="decor knob"></div>
                      <div className="decor knob"></div>
                      <div className="decor knob"></div>
                      <div className="decor knob"></div>
                      <div className="decor knob"></div>
                    </div>
                    <div className="generate-screen" id="generate-status" aria-live="polite">{generateStatus}</div>
                    <button className="generate-btn" id="generate-button" title="Generate Track" aria-label="Generate Track" onClick={handleAnalyzeAndGenerate}>
                      <img src="/icons/star.svg" className="generate-icon" alt="Generate" />
                    </button>
                  </div>
                  <div className="meter right" aria-hidden="true"></div>
                  <div className="brand-footer" aria-hidden="true">
                    <div className="brand-logo">
                      <span className="brand-k">K</span>
                      <span className="brand-airo">airo</span>
                    </div>
                    <div className="brand-tag">Powered by Kairo</div>
                  </div>
                </div>
              </div>

              <div className="mixer-panel panel-right" aria-label="Right volume panel">
                <div className={`vu-bars reactive ${isPlaying ? 'playing' : ''}`} aria-hidden="true">
                  {vuLevels.map((lvl, i) => (
                    <div key={i} className={`bar b${i+1}`} style={{ transform: `scaleY(${lvl})`, opacity: Math.max(0.35, lvl) }}></div>
                  ))}
                </div>
              </div>
              <div className="deck-container deck-right">
                <div className="deck-header-line">
                  <h2 className="deck-title">Style Deck</h2>
                  <button className="icon-btn help-btn" title="Help" aria-label="Help">?</button>
                </div>
                <div className="platter">
                  <Canvas size={420} onReady={setStyleCanvasEl} onChange={() => handleAnalyze('style')} color={styleColor} className={`lab-canvas ${isPlaying ? 'spinning' : ''}`} />
                </div>
                <div className="deck-result" aria-live="polite" style={{ marginTop: '10px', textAlign: 'center' }}>
                  <div className="prompt-label">Style</div>
                  <div className="prompt-value" id="display-style-inline">{selectedStyle || '?'}</div>
                </div>
                <div className="pad-grid" aria-label="Style deck pattern pads">
                  {padColors.map((c) => (
                    <button key={c} className="pad" style={{ '--pad-color': c }} onClick={() => setStyleColor(c)} aria-label={c}></button>
                  ))}
                </div>
                <div className="deck-controls">
                  <button className="icon-btn reset-btn" title="Delete pattern" aria-label="Delete pattern" onClick={() => resetCanvas('style')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 14h10l1-14" />
                      <path d="M10 10v8" />
                      <path d="M14 10v8" />
                    </svg>
                  </button>
                  <div className={`deck-status ${styleStatus === 'Ready' ? 'status-ready' : ''}`} id="style-status">{styleStatus}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}