import { Link } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'

export function LandingPage() {
  return (
    <main className="marketing-shell">
      <PublicNav />

      <section className="landing-hero">
        <div className="landing-copy">
          <h1>More beautiful work. Less order chaos.</h1>
          <p className="landing-lede">
            Bakery Orders gives your team one clear place to receive custom briefs, quote
            confidently, and keep every promise visible from first message to pickup.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/apply">Apply your bakery <span aria-hidden="true">↗</span></Link>
            <a className="text-link" href="#workflow">See the workflow <span aria-hidden="true">↓</span></a>
          </div>
          <p className="landing-note"><span aria-hidden="true">✦</span> We review every bakery before it goes live.</p>
        </div>
        <div className="hero-image" role="img" aria-label="A baker finishing a layered cake">
          <div className="hero-image-caption">
            <span>For the people behind the counter</span>
            <strong>Your craft, with a clearer next step.</strong>
          </div>
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="section-intro">
          <p className="landing-kicker">A better bakery day</p>
          <h2>From first idea to final pickup, everyone knows what happens next.</h2>
          <p>Give owners a clearer view and give the team fewer things to chase.</p>
        </div>
        <div className="landing-workflow-list">
          <div>
            <span>01</span>
            <h3>Receive a better brief</h3>
            <p>Customers share the details your team needs before anyone starts quoting.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Quote with confidence</h3>
            <p>Keep the conversation, choices, timing, and price together in one order.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Make the handoff visible</h3>
            <p>Orders, schedule, products, and stock stay aligned as the bake gets closer.</p>
          </div>
        </div>
      </section>

      <section className="landing-invite">
        <div>
          <p className="landing-kicker">Your next season starts here</p>
          <h2>Make room for the work customers remember.</h2>
          <p>Tell us about your bakery and we’ll take it from there.</p>
        </div>
        <Link className="btn btn-secondary" to="/apply">Start your application <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="marketing-footer">
        <span>Bakery Orders.</span>
        <span>Made for independent bakery teams.</span>
      </footer>
    </main>
  )
}
