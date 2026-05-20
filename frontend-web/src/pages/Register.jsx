import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import registerImage from '../assets/register_images/screen.png'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    <div className="h-screen w-full flex overflow-hidden">
      {/* Left side: Image and Text overlay */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-gray-900">
        <img
          src={registerImage}
          alt="Delicious food spread"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />
        
        {/* Logo at top left */}
        <div className="absolute top-8 left-8 flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-[#FE6B36] flex items-center justify-center text-white font-bold shadow-sm">
            R
          </div>
          <span className="font-bold text-xl tracking-tight text-white">ReciLink</span>
        </div>

        <div className="absolute bottom-10 left-10 right-10 text-white">
          <h1 className="text-3xl xl:text-4xl font-bold mb-2 leading-tight">
            Join the ReciLink Community
          </h1>
          <p className="text-sm xl:text-base text-gray-300 max-w-sm">
            Discover and share recipes from around the world.
          </p>
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex flex-col items-center justify-center bg-[#fafafa] px-6 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md py-4">
          
          <div className="text-left mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create an Account</h2>
            <p className="text-xs sm:text-sm text-gray-500">Start your culinary journey today.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs sm:text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                className="input-field bg-white"
                placeholder="chef_wan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="input-field bg-white"
                placeholder="chef.wan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    className="input-field bg-white"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  className="input-field bg-white"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start pt-1 pb-1">
              <div className="flex items-center h-4">
                <input
                  id="terms"
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-gray-300 text-[#FE6B36] focus:ring-[#FE6B36]"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                />
              </div>
              <div className="ml-2 text-xs">
                <label htmlFor="terms" className="font-medium text-gray-600">
                  I agree to the <a href="#" className="text-[#FE6B36] hover:underline">Terms</a> and <a href="#" className="text-[#FE6B36] hover:underline">Privacy Policy</a>.
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2">
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

          <div className="mt-5 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Or continue with</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <div className="mt-4">
            <button type="button" className="btn-outline">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </div>

          <p className="mt-5 text-center text-gray-600 text-xs sm:text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#993b1b] font-bold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
