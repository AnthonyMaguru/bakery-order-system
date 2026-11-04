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
            Crumb &amp; Co. gives your team one clear place to receive custom briefs, quote
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

      <section className="landing-workflow pricing-section" id="pricing">
        <div className="section-intro">
          <p className="landing-kicker">Straightforward pricing</p>
          <h2>A clear three-part model for bakery partners.</h2>
          <p>
            No surprise charges: setup is one-time, commission is tied to completed orders, and customers pay the bakery directly.
          </p>
        </div>
        <div className="pricing-tiers">
          <article className="pricing-tier">
            <span className="pricing-tier-number">01 · GET STARTED</span>
            <h3>One-time setup</h3>
            <strong className="pricing-amount">UGX 70,000</strong>
            <p>Initial setup fee per bakery. No recurring setup charge.</p>
          </article>
          <article className="pricing-tier pricing-tier-featured">
            <span className="pricing-tier-number">02 · WHEN YOU SELL</span>
            <h3>Completed-order commission</h3>
            <strong className="pricing-amount">Configurable rate</strong>
            <p>A percentage of completed order subtotal, disclosed before onboarding. Delivery is excluded; cancelled orders incur no commission.</p>
          </article>
          <article className="pricing-tier">
            <span className="pricing-tier-number">03 · FOR CUSTOMERS</span>
            <h3>No platform fee</h3>
            <strong className="pricing-amount">UGX 0</strong>
            <p>Customers pay the bakery directly. The bakery confirms delivery costs with the customer.</p>
          </article>
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
        <span><img src="/app_logo.png" alt="" className="brand-logo" />Crumb &amp; Co.</span>
        <span>Made for independent bakery teams.</span>
      </footer>
    </main>
  )
}
