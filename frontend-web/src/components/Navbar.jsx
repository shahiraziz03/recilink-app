import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Do not show navbar on auth pages
  if (['/login', '/register'].includes(location.pathname)) {
    return null
  }

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#FE6B36] flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform">
              R
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">ReciLink</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-gray-600 text-sm hidden sm:block font-medium">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 hover:text-[#FE6B36] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-[#FE6B36] transition-colors px-3 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-[#FE6B36] text-white hover:bg-[#e55928] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
