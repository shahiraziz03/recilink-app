import axios from 'axios'
import { BASE_URL } from './config'

const API = axios.create({
  baseURL: BASE_URL,
})

export const register = (data) => API.post('/auth/register', data)
export const login = (data) => API.post('/auth/login', data)

export default API
