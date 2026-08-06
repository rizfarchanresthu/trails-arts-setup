import { useCallback, useState } from 'react'

export type AppFont = 'cuprum' | 'geist'

const STORAGE_KEY = 'font'

function getDocumentFont(): AppFont {
  return document.documentElement.dataset.font === 'geist' ? 'geist' : 'cuprum'
}

function applyFont(font: AppFont) {
  document.documentElement.dataset.font = font
  localStorage.setItem(STORAGE_KEY, font)
}

export function useFont() {
  const [font, setFontState] = useState<AppFont>(getDocumentFont)

  const setFont = useCallback((next: AppFont) => {
    applyFont(next)
    setFontState(next)
  }, [])

  const toggleFont = useCallback(() => {
    setFont(getDocumentFont() === 'geist' ? 'cuprum' : 'geist')
  }, [setFont])

  return { font, setFont, toggleFont }
}
