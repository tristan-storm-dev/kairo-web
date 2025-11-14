import React, { useEffect, useRef } from 'react'

export default function Canvas({ size = 300, onReady, onChange, color = '#ffffff', className = 'lab-canvas' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let drawing = false
    let notifyTimer = null

    const scheduleNotify = () => {
      if (!onChange) return
      if (notifyTimer) clearTimeout(notifyTimer)
      notifyTimer = setTimeout(() => {
        onChange(canvas)
      }, 400)
    }

    const start = (e) => { drawing = true; draw(e) }
    const end = () => { drawing = false; ctx.beginPath(); scheduleNotify() }
    const pos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
      return { x, y }
    }
    const draw = (e) => {
      if (!drawing) return
      const { x, y } = pos(e)
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.strokeStyle = color || '#ffffff'
      ctx.lineTo(x, y)
      ctx.stroke()
      // Only notify after drawing completes to avoid spamming requests
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('touchstart', start, { passive: true })
    canvas.addEventListener('touchend', end, { passive: true })
    canvas.addEventListener('touchmove', draw, { passive: true })

    onReady?.(canvas)
    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchend', end)
      canvas.removeEventListener('touchmove', draw)
      if (notifyTimer) clearTimeout(notifyTimer)
    }
  }, [onReady, onChange, color])

  return (
    <canvas ref={ref} width={size} height={size} className={className} />
  )
}