import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">ReciLink</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-white/70 mb-10">
            Discover, share, and enjoy the best recipes from our community.
            Your next culinary adventure starts here.
          </p>

          {!user ? (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link to="/register" className="btn-primary w-full sm:w-auto text-lg">
                Get Started
              </Link>
              <Link to="/login" className="btn-secondary w-full sm:w-auto text-lg">
                Log In
              </Link>
            </div>
          ) : (
            <div className="glass-card max-w-md mx-auto p-6">
              <h2 className="text-2xl font-bold mb-2">Hello, {user.username}! 👋</h2>
              <p className="text-white/60 mb-6">You're logged in and ready to explore.</p>
              <button className="btn-primary w-full">Browse Recipes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
