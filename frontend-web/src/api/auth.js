import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
})

export const register = (data) => API.post('/auth/register', data)
export const login = (data) => API.post('/auth/login', data)

export default API
