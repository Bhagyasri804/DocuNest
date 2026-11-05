import { useState } from 'react'
import { Button, Card, Input, Loader, Modal } from './components'
import './App.css'

function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="showcase">
      <header className="showcase__header">
        <span className="showcase__eyebrow">DocuNest UI kit</span>
        <h1>Reusable components</h1>
        <p>Accessible, flexible building blocks for DocuNest.</p>
      </header>

      <div className="showcase__grid">
        <Card
          title="Buttons"
          description="Variants, sizes, and interaction states."
          className="showcase__card"
        >
          <div className="showcase__stack">
            <div className="showcase__row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
            </div>
            <div className="showcase__row">
              <Button size="small">Small</Button>
              <Button size="large">Large</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Saving</Button>
            </div>
          </div>
        </Card>

        <Card
          title="Inputs"
          description="Controlled fields with labels, required states, and validation."
          className="showcase__card"
        >
          <div className="showcase__stack">
            <Input
              label="Your name"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              errorMessage={email && !email.includes('@') ? 'Enter a valid email address.' : ''}
            />
            <div className="showcase__row">
              <Input label="Search" type="search" placeholder="Search documents" />
              <Input label="Disabled" placeholder="Unavailable" disabled />
            </div>
          </div>
        </Card>

        <Card
          title="Card with footer"
          description="Compose a header, content area, and optional footer."
          footer={<span className="showcase__muted">Last updated just now</span>}
          className="showcase__card"
        >
          <p className="showcase__body-copy">
            This card keeps its content flexible while applying consistent spacing and responsive styling.
          </p>
        </Card>

        <Card
          title="Loading indicators"
          description="Three sizes with an optional accessible status label."
          className="showcase__card"
        >
          <div className="showcase__loaders">
            <Loader size="small" text="Small" />
            <Loader size="medium" text="Medium" />
            <Loader size="large" text="Large" />
          </div>
        </Card>

        <Card
          title="Modal dialog"
          description="Keyboard dismissible, focus managed, and locks background scrolling."
          className="showcase__card showcase__card--wide"
        >
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Continue</Button>
          </>
        }
      >
        <p>
          This dialog supports the close button, Escape key, and backdrop click. Try each to dismiss it.
        </p>
      </Modal>
    </main>
  )
}

export default App
