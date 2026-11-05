import { useId } from 'react'
import './Input.css'

function Input({
  id,
  label,
  type = 'text',
  placeholder,
  error,
  errorMessage,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const message = errorMessage || error
  const errorId = `${inputId}-error`
  const classes = ['input__control', message && 'input__control--error', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="input">
      {label && (
        <label className="input__label" htmlFor={inputId}>
          {label}
          {required && <span className="input__required" aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={classes}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={message ? 'true' : undefined}
        aria-describedby={message ? errorId : undefined}
      />
      {message && (
        <p className="input__error" id={errorId} role="alert">
          {message}
        </p>
      )}
    </div>
  )
}

export default Input
