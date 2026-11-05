import './Card.css'

function Card({ title, description, children, footer, className = '' }) {
  const classes = ['card', className].filter(Boolean).join(' ')

  return (
    <section className={classes}>
      {(title || description) && (
        <header className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {description && <p className="card__description">{description}</p>}
        </header>
      )}
      <div className="card__body">{children}</div>
      {footer != null && <footer className="card__footer">{footer}</footer>}
    </section>
  )
}

export default Card
