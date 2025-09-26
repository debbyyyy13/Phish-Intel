import React from 'react'

export default function Footer(){
  return (
    <footer className="bg-white border-t mt-16">
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-phishgray">
        © {new Date().getFullYear()} PhishGuard — All rights reserved.
      </div>
    </footer>
  )
}
