import { useState, useEffect } from 'react'
import client, { setAuthToken } from '../api'

export default function useAuth(){
  const [user, setUser] = useState(()=> {
    try { return JSON.parse(localStorage.getItem('phish_user')) || null } catch { return null }
  })
  useEffect(()=> {
    const t = localStorage.getItem('phish_token')
    if(t) setAuthToken(t)
  }, [])
  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    const { access_token, user } = res.data
    localStorage.setItem('phish_token', access_token)
    localStorage.setItem('phish_user', JSON.stringify(user))
    setAuthToken(access_token)
    setUser(user)
    return user
  }
  const signup = async (email, password, confirm) => {
    const res = await client.post('/auth/signup', { email, password, confirm_password: confirm })
    const { access_token, user } = res.data
    localStorage.setItem('phish_token', access_token)
    localStorage.setItem('phish_user', JSON.stringify(user))
    setAuthToken(access_token)
    setUser(user)
    return user
  }
  const logout = () => {
    localStorage.removeItem('phish_token')
    localStorage.removeItem('phish_user')
    setAuthToken(null)
    setUser(null)
  }
  return { user, login, signup, logout }
}
