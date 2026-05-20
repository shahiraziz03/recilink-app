import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import loginImage from '../assets/login_images/screen.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loginUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login({ email, password })
      loginUser(response.data.user, response.data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* Left side: Image and Text overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src={loginImage}
          alt="Delicious food collection"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
        
        {/* Logo at top left */}
        <div className="absolute top-8 left-8 flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-[#FE6B36] flex items-center justify-center text-white font-bold shadow-sm">
            R
          </div>
          <span className="font-bold text-xl tracking-tight text-white">ReciLink</span>
        </div>

        <div className="absolute bottom-12 left-12 right-12 text-white">
          <span className="inline-block bg-[#FE6B36] text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded mb-3 uppercase tracking-wider">
            Featured Collection
          </span>
          <h1 className="text-4xl xl:text-5xl font-bold mb-3 leading-tight">
            Master the art of <br /> authentic cuisines.
          </h1>
          <p className="text-base xl:text-lg text-gray-200 max-w-md leading-relaxed">
            Discover thousands of curated recipes and share your culinary journey with a global community of food lovers.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-[#fafafa] px-6 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Logo icon for mobile only */}
          <div className="flex lg:hidden justify-center mb-6">
            <div className="w-12 h-12 bg-[#FE6B36] rounded-xl flex items-center justify-center transform rotate-3 shadow-lg">
              <svg className="w-6 h-6 text-white transform -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-sm sm:text-base text-gray-500">Continue your culinary discovery</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-5 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email or Username</label>
              <input
                type="email"
                required
                className="input-field bg-[#fff8f6] border-[#ffe8e0] focus:bg-white"
                placeholder="chef.wan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs sm:text-sm font-medium text-[#FE6B36] hover:text-[#e55928]">Forgot Password?</a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="input-field bg-[#fff8f6] border-[#ffe8e0] focus:bg-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Or continue with</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <div className="mt-5">
            <button type="button" className="btn-outline">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <p className="mt-6 text-center text-gray-600 text-xs sm:text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#FE6B36] hover:text-[#e55928] font-bold">
              Sign up
            </Link>
          </p>
          
          <div className="mt-8 lg:mt-12 flex justify-between text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Secure Access</span>
            <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Recipe Synced</span>
          </div>
        </div>
      </div>
    </div>
  )
}
