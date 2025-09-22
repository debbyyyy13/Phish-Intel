import React from 'react'

export default function Hero(){
  return (
    <section className="bg-phishnavy text-white">
      <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="fade-in">
          <nav className="text-sm text-white/70 mb-6">Home &nbsp;&gt;&nbsp; Products &nbsp;&gt;&nbsp; Phish Threat</nav>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">Phishing attack simulation and training for your end users.</h1>
          <p className="mt-6 text-phishgray max-w-xl text-lg">Protect your organization with intelligent detection, quarantine and embedded user training — all in one platform.</p>
          <div className="mt-8 flex gap-4">
            <button className="bg-white text-phishnavy font-semibold px-6 py-3 rounded-full shadow hover:opacity-95 focus:outline focus:outline-2 focus:outline-white">Free Trial</button>
            <button className="border border-white text-white px-6 py-3 rounded-full hover:bg-white/10 focus:outline focus:outline-2 focus:outline-white">Get Pricing</button>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md">
            {/* Inline SVG hero illustration */}
            <svg viewBox="0 0 600 400" className="w-full h-auto" aria-hidden>
              <rect width="100%" height="100%" rx="12" fill="transparent" />
              <g transform="translate(50,30)">
                <rect x="40" y="40" width="320" height="200" rx="10" fill="#0b234b"/>
                <rect x="60" y="70" width="280" height="140" rx="6" fill="#1e40af"/>
                <circle cx="260" cy="40" r="28" fill="#ff9f1c"/>
                <path d="M340 100 q60 -30 100 0" stroke="#ff9f1c" strokeWidth="4" fill="none" />
                <text x="80" y="120" fill="#fff" fontSize="14">You received a message from support@bank.com</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
