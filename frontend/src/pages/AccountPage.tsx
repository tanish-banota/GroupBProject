import { useState, type FormEvent } from 'react'
import { useAuth } from '../AuthContext'

function ProfileForm({ initialName, saveDisplayName }: {
  initialName: string
  saveDisplayName: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await saveDisplayName(name)
      setSaved(true)
    } catch {
      // AuthProvider shows the database error above the page.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="account-form" onSubmit={(event) => void save(event)}>
      <label htmlFor="display-name">Display name</label>
      <input id="display-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} maxLength={100} />
      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      {saved && <span role="status">Saved</span>}
    </form>
  )
}

export default function AccountPage() {
  const { user, profile, loading, signIn, signOut, saveDisplayName } = useAuth()

  if (loading) return <p className="muted">Loading account…</p>

  if (!user) {
    return (
      <div className="page">
        <h1>Account</h1>
        <p>Sign in to create an account and edit your profile.</p>
        <button type="button" onClick={() => void signIn()}>Sign in with Google</button>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Account</h1>
      <p className="muted">Signed in as {user.email ?? user.id}</p>
      {profile ? (
        <ProfileForm key={profile.id} initialName={profile.display_name ?? ''} saveDisplayName={saveDisplayName} />
      ) : (
        <p className="muted">Loading your profile…</p>
      )}
      <button type="button" className="secondary" onClick={() => void signOut()}>Sign out</button>
    </div>
  )
}
