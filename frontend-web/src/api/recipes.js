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

export default API
