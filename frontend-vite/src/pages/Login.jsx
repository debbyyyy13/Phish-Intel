import React from 'react'
import Header from '../components/Header'
import LoginCard from '../components/LoginCard'
import Footer from '../components/Footer'
import useAuth from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(mode, payload){
    if(mode === 'signin'){
      await login(payload.email, payload.password)
      navigate('/dashboard')
    } else {
      if(payload.password !== payload.confirm) throw new Error('Passwords do not match')
      await signup(payload.email, payload.password, payload.confirm)
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-center mb-8">
            <img src="/phishintel-logo.png" alt="PhishIntel" className="w-48 h-48 object-contain" />
          </div>
          <LoginCard onSubmit={handleSubmit} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
