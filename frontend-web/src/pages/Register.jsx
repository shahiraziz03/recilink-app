import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import registerImage from '../assets/register_images/screen.png'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service.')
      return
    }

    setLoading(true)

    try {
      await register({ username, email, password })
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } })
    } catch (err) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to register.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#fff8f6]">
      {/* Left side: Image and Text overlay */}
      <div className="hidden md:flex md:w-[55%] relative bg-gray-900 overflow-hidden group">
        <img
          src={registerImage}
          alt="Delicious food spread"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[15000ms] ease-linear group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

        {/* Logo at top left */}
        <div className="absolute top-8 left-8 flex items-center gap-2 group/logo cursor-pointer z-10" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-[#FE6B36] flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover/logo:scale-105">
            R
          </div>
          <span className="font-bold text-xl tracking-tight text-white transition-opacity group-hover/logo:opacity-90">ReciLink</span>
        </div>

        <div className="absolute bottom-12 left-12 right-12 text-white z-10">
          <span className="inline-block bg-white/20 backdrop-blur-sm border border-white/20 text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider shadow-lg">
            Join the Community
          </span>
          <h1 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight drop-shadow-md">
            Start your <span className="italic font-serif text-[#FE6B36]">culinary</span> <br /> journey today.
          </h1>
          <p className="text-base xl:text-lg text-gray-200 max-w-md leading-relaxed drop-shadow-sm">
            Discover and share recipes from around the world.
          </p>
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="w-full md:w-[45%] flex flex-col items-center justify-center bg-[#fff8f6] px-6 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md py-8">

          {/* Logo icon for mobile only */}
          <div className="flex md:hidden justify-center mb-6">
            <div className="w-12 h-12 bg-[#FE6B36] rounded-xl flex items-center justify-center transform rotate-3 shadow-lg hover:rotate-6 transition-transform">
              <span className="text-white font-bold text-2xl transform -rotate-3">R</span>
            </div>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create an Account</h2>
            <p className="text-xs sm:text-sm text-gray-500">Become a master chef today.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-5 text-sm border border-red-200 shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                required
                className="input-field shadow-sm bg-white border-gray-200 focus:ring-4 focus:ring-[#FE6B36]/10 focus:border-[#FE6B36]"
                placeholder="chef_wan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                className="input-field shadow-sm bg-white border-gray-200 focus:ring-4 focus:ring-[#FE6B36]/10 focus:border-[#FE6B36]"
                placeholder="chef.wan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field shadow-sm bg-white border-gray-200 focus:ring-4 focus:ring-[#FE6B36]/10 focus:border-[#FE6B36]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input-field shadow-sm bg-white border-gray-200 focus:ring-4 focus:ring-[#FE6B36]/10 focus:border-[#FE6B36]"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start pt-2 pb-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-[#FE6B36] focus:ring-[#FE6B36] transition-colors"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                />
              </div>
              <div className="ml-3 text-xs sm:text-sm">
                <label htmlFor="terms" className="font-medium text-gray-600">
                  I agree to the <a href="#" className="text-[#FE6B36] hover:underline font-semibold transition-colors">Terms</a> and <a href="#" className="text-[#FE6B36] hover:underline font-semibold transition-colors">Privacy Policy</a>.
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 shadow-md hover:shadow-lg shadow-[#FE6B36]/20 bg-gradient-to-r from-[#FE6B36] to-[#ff8454]">
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Register Account'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest">Or continue with</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <div className="mt-5">
            <button type="button" className="btn-outline shadow-sm hover:shadow-md transition-shadow">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </div>

          <p className="mt-6 text-center text-gray-600 text-xs sm:text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FE6B36] font-bold hover:text-[#e55928] transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
