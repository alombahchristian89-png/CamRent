import { useEffect, useRef, useState } from 'react'
import { Check, Globe2 } from 'lucide-react'
import { translate } from '../../utils/i18n'

const LanguageIconMenu = ({
  language = 'en',
  onSelect,
  disabled = false,
  buttonClassName = '',
  menuClassName = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleSelect = (nextLanguage) => {
    if (typeof onSelect === 'function') {
      onSelect(nextLanguage)
    }
    setIsMenuOpen(false)
  }

  const languageOptions = [
    { value: 'en', label: translate(language, 'languageEnglish', 'English') },
    { value: 'fr', label: translate(language, 'languageFrench', 'French') }
  ]

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        disabled={disabled}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50/95 text-slate-600 shadow-sm backdrop-blur-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 ${buttonClassName}`.trim()}
        aria-label={translate(language, 'prefLanguageTitle', 'Language')}
        title={translate(language, 'prefLanguageTitle', 'Language')}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
      >
        <Globe2 className="h-4 w-4" />
      </button>

      {isMenuOpen && (
        <div
          className={`absolute right-0 z-50 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${menuClassName}`.trim()}
          role="menu"
        >
          {languageOptions.map((option) => {
            const isSelected = option.value === language

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={disabled}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                role="menuitemradio"
                aria-checked={isSelected}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LanguageIconMenu