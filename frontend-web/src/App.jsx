import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RecipeDetail from './pages/RecipeDetail'
import Recommendations from './pages/Recommendations'
import Grocery from './pages/Grocery'
import PostRecipe from './pages/PostRecipe'
import Community from './pages/Community'

const AUTH_ROUTES = ['/login', '/register']

function Layout() {
  const location = useLocation()
  const isAuthPage = AUTH_ROUTES.includes(location.pathname)

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#fff8f6]">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-56 h-screen overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/grocery" element={<Grocery />} />
          <Route path="/post" element={<PostRecipe />} />
          <Route path="/community" element={<Community />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Future pages added here */}
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
