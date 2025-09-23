# 🛡️ PhishIntel Web App

PhishIntel is a **cybersecurity web application** for detecting and managing phishing emails.  
It integrates a **React + Vite + Tailwind frontend** with a **Node/Express backend** (and optional ML phishing detection service).  

The system provides:
- A user-friendly **dashboard** with charts & analytics
- **Email quarantine** and classification system
- **Authentication & authorization** (JWT-based)
- **Modern UI/UX** with responsive design

---

## ✨ Features
- 🚪 User authentication (Sign Up / Login)  
- 📩 Email submission for phishing detection  
- 📊 Interactive analytics dashboard (Recharts + Lucide Icons)  
- 🗂️ Quarantine inbox for suspicious emails  
- ⚡ Fast frontend powered by **Vite + React + Tailwind**  
- 🔒 Secure backend with **Express + MongoDB + JWT**  
- 📱 Responsive UI for desktop & mobile  

---

## 🏗️ Project Architecture
phishintel/
│── backend/ # Backend API (Node/Express)
│ ├── server.js # Entry point
│ ├── routes/ # API routes
│ ├── models/ # Mongoose models
│ └── controllers/ # Business logic
│
│── frontend-vite/ # Frontend (React + Vite + Tailwind)
│ ├── public/ # Static assets (logo, favicon)
│ ├── src/
│ │ ├── api/ # Axios client setup
│ │ ├── components/ # Shared components (Topbar, Footer, Hero, LoginCard)
│ │ ├── pages/ # App pages (Landing, Login, Signup, Dashboard, Quarantine)
│ │ ├── App.jsx # React Router setup
│ │ └── main.jsx # App entry point
│ ├── tailwind.config.js # Tailwind configuration
│ └── vite.config.js # Vite dev config
│
│── .env # Environment variables
│── package.json
│── README.md


## 🛠️ Tech Stack
### Frontend
- [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)  
- [TailwindCSS](https://tailwindcss.com/)  
- [Axios](https://axios-http.com/)  
- [Lucide React](https://lucide.dev/) (icons)  
- [Recharts](https://recharts.org/) (charts)  

### Backend
- [Node.js](https://nodejs.org/)  
- [Express](https://expressjs.com/)  
- [MongoDB](https://www.mongodb.com/) (Mongoose ORM)  
- [JWT](https://jwt.io/) for authentication  


## ⚙️ Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/phishintel.git
cd phishintel

## 2. Backend Setup
cd backend
npm install

### Create a .env file in /backend
PORT=5000
MONGO_URI=mongodb://localhost:27017/phishintel
JWT_SECRET=your_jwt_secret

#### Run Backend
npm run dev
API available at → http://localhost:5000

## 3. Frontend Setup
cd ../frontend-vite
npm install

### Create a .env file in /frontend-vite
VITE_API_URL=http://localhost:5000

### Run Frontend
npm run dev
Frontend available at → http://localhost:5173

## 🔗 Vite Proxy Config
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})

## 🎨 Tailwind Config
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        phishnavy: "#07143a",
        phishblue: "#1e40af",
        phishblack: "#000000",
        phishgray: "#6b7280"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
}

##📊 Routes & API Endpoints
###Frontend Routes
/ → Landing Page
/login → Login Page
/signup → Sign Up Page
/dashboard → User dashboard (charts & stats)
/submit → Submit email for phishing detection
/quarantine → Quarantined email inbox

###Backend API
POST /api/v1/auth/signup → Create new user
POST /api/v1/auth/login → Authenticate user
POST /api/v1/classify → Classify an email
GET /api/v1/quarantine → Fetch quarantined emails

##📦 Dependencies
###Frontend
npm install react react-dom react-router-dom axios tailwindcss lucide-react recharts

###Backend
npm install express mongoose cors dotenv jsonwebtoken bcryptjs
npm install --save-dev nodemon

##🧪 Running Locally
Start backend (npm run dev inside /backend)
Start frontend (npm run dev inside /frontend-vite)
Visit http://localhost:5173
 in browser
Sign up → Log in → Submit an email → View dashboard & quarantine

##📌 Roadmap
 Add email release/restore workflow in quarantine
 Implement multi-user roles (Admin, Analyst, User)
 Deploy frontend (Netlify / Vercel)
 Deploy backend (Render / Heroku / Docker)
 Enhance ML phishing detection service

🚀 Deployment Guide
Frontend (Vercel/Netlify)
Push frontend-vite/ to GitHub
Connect repo to Vercel or Netlify
Add env var: VITE_API_URL=https://your-backend-url

Backend (Render/Heroku)
Push backend/ to GitHub
Deploy on Render or Heroku
Set env vars (MONGO_URI, JWT_SECRET)

👨‍💻 Author

Deborah
PhishIntel — Cybersecurity SaaS for phishing detection.

📧 Reach me: oaihimiredeborah@gmail.com

🌐 GitHub: @debbyyyy13
