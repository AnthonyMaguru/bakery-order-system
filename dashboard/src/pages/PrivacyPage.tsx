import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <main className="application-shell">
      <nav className="marketing-nav">
        <Link className="wordmark" to="/"><img src="/app_logo.png" alt="" className="brand-logo" />Crumb &amp; Co.</Link>
        <Link className="text-link" to="/apply">Apply your bakery</Link>
      </nav>
      <article className="application-form-panel stack-lg" style={{ maxWidth: 760, margin: '40px auto' }}>
        <p className="eyebrow">Privacy notice</p>
        <h1>How application information is used</h1>
        <p>When a bakery applies, we collect the bakery name, contact person, email, phone number, location, and any optional notes you provide.</p>
        <p>We use this information to review the application, contact the applicant, and—if approved—set up the bakery workspace. Application details are visible to authorized platform administrators.</p>
        <p>We do not sell application information or use it to charge customers. Contact information may be retained while the application and any resulting bakery account are active, and longer when needed for legitimate operational or legal obligations.</p>
        <p>Before public launch, the platform operator must publish a monitored privacy-contact address here for access, correction, and deletion requests.</p>
        <Link className="btn btn-outline" to="/">Back to Crumb &amp; Co.</Link>
      </article>
    </main>
  )
}
