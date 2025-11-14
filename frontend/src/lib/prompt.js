// Prompt vocab and normalization

export const genreTokens = {
  Techno: 'techno',
  House: 'house',
  'Hip Hop': 'hiphop',
  Ambient: 'ambient',
  'Drum & Bass': 'dnb'
}

export const genreVocab = {
  Techno: {
    vibe: ['dark','hypnotic','industrial','warehouse','minimal','driving'],
    style: ['acid','dub','melodic','raw','peak','deep']
  },
  House: {
    vibe: ['funky','soulful','uplifting','groovy','classic','deep'],
    style: ['garage','jackin','disco','progressive','minimal','chicago']
  },
  'Hip Hop': {
    vibe: ['boombap','trap','jazzy','gritty','lofi','modern'],
    style: ['eastcoast','westcoast','drill','golden','underground','chopped']
  },
  Ambient: {
    vibe: ['ethereal','soothing','drone','cinematic','lush','meditative'],
    style: ['textural','minimal','space','calm','organic','granular']
  },
  'Drum & Bass': {
    vibe: ['liquid','dark','neuro','atmospheric','roller','deep'],
    style: ['jungle','techstep','jumpup','minimal','classic','modern']
  }
}

export const genreSynonyms = {
  Techno: {
    vibe: {
      dark: 'dark',
      energetic: 'driving',
      calm: 'minimal',
      futuristic: 'industrial',
      mysterious: 'warehouse',
      euphoric: 'melodic'
    },
    style: {
      progressive: 'peak',
      afro: 'dub',
      funky: 'raw',
      deep: 'deep',
      melodic: 'melodic'
    }
  },
  House: {
    vibe: {
      dark: 'deep',
      energetic: 'uplifting',
      calm: 'soulful',
      futuristic: 'classic',
      mysterious: 'deep',
      euphoric: 'uplifting'
    },
    style: {
      progressive: 'progressive',
      afro: 'jackin',
      funky: 'disco',
      deep: 'minimal',
      melodic: 'progressive'
    }
  },
  'Hip Hop': {
    vibe: {
      dark: 'gritty',
      energetic: 'trap',
      calm: 'lofi',
      futuristic: 'modern',
      mysterious: 'underground',
      euphoric: 'jazzy'
    },
    style: {
      progressive: 'modern',
      afro: 'westcoast',
      funky: 'golden',
      deep: 'underground',
      melodic: 'golden'
    }
  },
  Ambient: {
    vibe: {
      dark: 'drone',
      energetic: 'cinematic',
      calm: 'soothing',
      futuristic: 'ethereal',
      mysterious: 'ethereal',
      euphoric: 'lush'
    },
    style: {
      progressive: 'space',
      afro: 'organic',
      funky: 'organic',
      deep: 'minimal',
      melodic: 'textural'
    }
  },
  'Drum & Bass': {
    vibe: {
      dark: 'dark',
      energetic: 'roller',
      calm: 'liquid',
      futuristic: 'neuro',
      mysterious: 'deep',
      euphoric: 'atmospheric'
    },
    style: {
      progressive: 'modern',
      afro: 'jungle',
      funky: 'jungle',
      deep: 'minimal',
      melodic: 'classic'
    }
  }
}

export function normalizeKeyword(raw, allowed = [], synonymsMap = {}) {
  const fallback = allowed && allowed.length ? allowed[0] : ''
  if (!raw) return fallback
  const t = raw.toString().toLowerCase().replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/).filter(Boolean)

  for (const w of t) {
    if (allowed.includes(w)) return w
  }
  if (synonymsMap) {
    for (const w of t) {
      const mapped = synonymsMap[w]
      if (mapped && allowed.includes(mapped)) return mapped
    }
    const keys = Object.keys(synonymsMap)
    for (const key of keys) {
      for (const w of t) {
        if (w.includes(key) || key.includes(w)) {
          const mapped = synonymsMap[key]
          if (mapped && allowed.includes(mapped)) return mapped
        }
      }
    }
  }

  let best = fallback
  let score = 0
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

export function buildPrompt(selectedGenreName, selectedVibe, selectedStyle, selectedLayer) {
  const genreToken = (genreTokens[selectedGenreName] || 'house')
  const vocab = genreVocab[selectedGenreName] || { vibe: [], style: [] }
  const vibeToken = normalizeKeyword(selectedVibe, vocab.vibe, (genreSynonyms[selectedGenreName]||{}).vibe)
  const styleToken = normalizeKeyword(selectedStyle, vocab.style, (genreSynonyms[selectedGenreName]||{}).style)
  const layerToken = (selectedLayer || 'Slow').toString().toLowerCase()
  return `${genreToken} ${vibeToken} ${styleToken} ${layerToken}`
}