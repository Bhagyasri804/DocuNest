import './Loader.css'

function Loader({ size = 'medium', text, className = '' }) {
  const classes = ['loader', `loader--${size}`, className].filter(Boolean).join(' ')

  return (
    <span className={classes} role="status">
      <span className="loader__spinner" aria-hidden="true" />
      <span className="loader__text">{text || 'Loading'}</span>
    </span>
  )
}

export default Loader
