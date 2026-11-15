import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  saveDisplayName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(null)
  const userId = user?.id

  useEffect(() => {
    if (!supabase) return
    let active = true
    const client = supabase

    client.auth.getSession().then(({ data, error: authError }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setError(authError?.message ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setProfile(null)
      setError(null)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !userId) return
    let active = true
    const client = supabase

    client.from('users').select('id, display_name, avatar_url').eq('id', userId).single()
      .then(({ data, error: profileError }) => {
        if (!active) return
        if (profileError) setError(profileError.message)
        else setProfile(data)
      })

    return () => { active = false }
  }, [userId])

  const signIn = async () => {
    if (!supabase) {
      setError('Add the Supabase URL and publishable key to frontend/.env.local, then restart Vite.')
      return
    }
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (signInError) setError(signInError.message)
  }

  const signOut = async () => {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  const saveDisplayName = async (name: string) => {
    if (!supabase || !user) return
    setError(null)
    const { data, error: updateError } = await supabase.from('users')
      .update({ display_name: name.trim() || null })
      .eq('id', user.id)
      .select('id, display_name, avatar_url')
      .single()
    if (updateError) {
      setError(updateError.message)
      throw updateError
    }
    setProfile(data)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signOut, saveDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
