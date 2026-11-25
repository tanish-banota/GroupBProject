import { useState, type FormEvent } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabase'

export default function LoginPage() {
  const { error, signIn } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setMessage(null)
    if (!supabase) {
      setFormError('Supabase is not configured for this app.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'sign-in') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) setFormError(authError.message)
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (authError) setFormError(authError.message)
        else if (!data.session) setMessage('Check your email for a confirmation link, then sign in.')
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const changeMode = (next: 'sign-in' | 'sign-up') => {
    setMode(next)
    setPassword('')
    setFormError(null)
    setMessage(null)
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <span className="login-card__eyebrow">Rutgers Schedule</span>
        <h1>Plan your semester</h1>
        <p>Sign in to choose classes and keep your schedule saved to your account.</p>
        <div className="login-card__tabs" role="group" aria-label="Account action">
          <button type="button" className={mode === 'sign-in' ? 'active' : ''} onClick={() => changeMode('sign-in')} aria-pressed={mode === 'sign-in'}>Sign in</button>
          <button type="button" className={mode === 'sign-up' ? 'active' : ''} onClick={() => changeMode('sign-up')} aria-pressed={mode === 'sign-up'}>Create account</button>
        </div>
        <form className="login-card__form" onSubmit={(event) => void submitEmail(event)}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in with email' : 'Create account with email'}</button>
        </form>
        {formError && <p role="alert" className="error">{formError}</p>}
        {message && <p role="status">{message}</p>}
        <div className="login-card__divider">or</div>
        <button type="button" className="secondary login-card__google" onClick={() => void signIn()} disabled={submitting}>Continue with Google</button>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </main>
  )
}
