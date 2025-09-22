import React from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Footer from '../components/Footer'

export default function Home(){
  return (
    <div className="min-h-screen bg-white text-phishnavy">
      <Header />
      <Hero />
      <Footer />
    </div>
  )
}
