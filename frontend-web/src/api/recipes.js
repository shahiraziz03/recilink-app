import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
})

// Attach token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('recilink_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle expired or invalid tokens cleanly
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('recilink_token')
        localStorage.removeItem('recilink_user')
      }
    }
    return Promise.reject(error)
  }
)

// Recipes
export const getRecipes = (page = 1, limit = 12) =>
  API.get(`/recipes?page=${page}&limit=${limit}`)

export const getRecipeById = (id) => API.get(`/recipes/${id}`)

export const searchRecipes = ({ q, cuisine, difficulty }) => {
  const params = new URLSearchParams()
  if (q) params.append('q', q)
  if (cuisine) params.append('cuisine', cuisine)
  if (difficulty) params.append('difficulty', difficulty)
  return API.get(`/recipes/search?${params.toString()}`)
}

export const createRecipe = (data) => API.post('/recipes', data)

// Posts
export const getPosts = () => API.get('/posts')
export const getPostById = (id) => API.get(`/posts/${id}`)
export const createPost = (data) => API.post('/posts', data)

// Recommendations
export const getRecommendations = (ingredients) =>
  API.post('/recommendations/recipes', { ingredients })

export const getGrocerySuggestions = (ingredients) =>
  API.post('/recommendations/grocery', { ingredients })

export const getPopularIngredients = () =>
  API.get('/recommendations/popular-ingredients')

export const searchIngredients = (q) =>
  API.get(`/recommendations/ingredients/search?q=${encodeURIComponent(q)}`)

export const getSimilarRecipes = (recipeId, limit = 10) =>
  API.get(`/recommendations/recipes/${recipeId}/similar?limit=${limit}`)

// Recipe Matching / Pantry
export const matchRecipes = (ingredients) =>
  API.post('/recipes/match', { ingredients })

// Social Actions
export const getComments = (recipeId) =>
  API.get(`/social/recipes/${recipeId}/comments`)

export const createComment = (recipeId, content) =>
  API.post(`/social/recipes/${recipeId}/comments`, { content })

export const toggleSaveRecipe = (recipeId) =>
  API.post(`/social/recipes/${recipeId}/save`)

export const isRecipeSaved = (recipeId) =>
  API.get(`/social/recipes/${recipeId}/is-saved`)

export const getSavedRecipes = () =>
  API.get('/social/recipes/saved')

// Profile and Following
export const getUserProfile = (userId) =>
  API.get(`/social/users/${userId}/profile`)

export const followUser = (userId) =>
  API.post(`/social/users/${userId}/follow`)

export const unfollowUser = (userId) =>
  API.delete(`/social/users/${userId}/follow`)

export const getUserFollowers = (userId) =>
  API.get(`/social/users/${userId}/followers`)

export const getUserFollowing = (userId) =>
  API.get(`/social/users/${userId}/following`)

export const getMyProfile = () =>
  API.get('/profile/me')

export const updateMyProfile = (data) =>
  API.put('/profile/me', data)

export const getStreak = () =>
  API.get('/profile/streak')

export const dailyCheckin = () =>
  API.post('/profile/checkin')

export const getUserRecipes = (userId) =>
  API.get(`/social/users/${userId}/recipes`)

export const getUserPosts = (userId) =>
  API.get(`/social/users/${userId}/posts`)

// Post likes & feeds
export const toggleLikePost = (postId) =>
  API.post(`/social/posts/${postId}/like`)

export const getTrendingPosts = () =>
  API.get('/posts/trending')

export const getFollowingPosts = () =>
  API.get('/posts/feed/following')

export default API
