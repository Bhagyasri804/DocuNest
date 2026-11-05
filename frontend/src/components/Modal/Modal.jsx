import { useEffect, useId, useRef } from 'react'
import './Modal.css'

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  closeOnBackdrop = true,
  className = '',
}) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll(focusableSelector)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!first) {
        event.preventDefault()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const initialFocus = dialogRef.current?.querySelector(focusableSelector)
    ;(initialFocus || dialogRef.current)?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const classes = ['modal__dialog', className].filter(Boolean).join(' ')

  return (
    <div
      className="modal__backdrop"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        ref={dialogRef}
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex="-1"
      >
        <header className="modal__header">
          {title && <h2 className="modal__title" id={titleId}>{title}</h2>}
          <button
            className="modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer != null && <footer className="modal__footer">{footer}</footer>}
      </section>
    </div>
  )
}

export default Modal
