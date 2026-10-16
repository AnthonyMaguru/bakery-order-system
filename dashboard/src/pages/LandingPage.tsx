import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <main className="marketing-shell">
      <nav className="marketing-nav" aria-label="Main navigation">
        <Link className="wordmark" to="/">Crumb & Co.</Link>
        <div className="marketing-nav-links">
          <a href="#how-it-works">How it works</a>
          <Link className="btn btn-dark btn-sm" to="/orders">Owner sign in</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">For bakeries with something to say</p>
          <h1>Make the cake. We’ll make the busywork lighter.</h1>
          <p className="landing-lede">
            Crumb & Co. gives independent bakeries a calmer way to receive custom orders,
            answer customers, and keep every handoff in one warm, organised place.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/apply">Apply to join</Link>
            <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↘</span></a>
          </div>
          <p className="landing-note">We review every bakery before it goes live.</p>
        </div>
        <div className="hero-image" role="img" aria-label="A baker finishing a layered cake">
          <div className="hero-image-caption">
            <span>01 / A better brief</span>
            <strong>From first idea to final pickup.</strong>
          </div>
        </div>
      </section>

      <section className="landing-strip" id="how-it-works">
        <div>
          <p className="eyebrow">The good part</p>
          <h2>Your craft stays centre stage.</h2>
        </div>
        <p>
          A thoughtful front door for new customers, plus the practical tools your team
          needs after the order arrives.
        </p>
        <div className="landing-points">
          <span><b>01</b> Bring your menu online</span>
          <span><b>02</b> Collect clearer custom briefs</span>
          <span><b>03</b> Keep the whole team in step</span>
        </div>
      </section>

      <section className="landing-invite">
        <div>
          <p className="eyebrow">A considered start</p>
          <h2>Tell us what you’re baking.</h2>
        </div>
        <Link className="btn btn-secondary" to="/apply">Start your application <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="marketing-footer">
        <span>Crumb & Co.</span>
        <span>Made for independent bakeries.</span>
      </footer>
    </main>
  )
}
