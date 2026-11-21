import API from './recipes.js'
import { BASE_URL } from './config'

/**
 * Create a new recipe + community post in one flow.
 * Step 1: POST /recipes  → get recipe_id
 * Step 2: POST /posts    → link caption + photo to recipe
 */
export async function createRecipePost(recipeData, postData, token) {
  // Step 1 — Create the recipe
  const recipeRes = await fetch(`${BASE_URL}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(recipeData),
  })

  if (!recipeRes.ok) {
    const err = await recipeRes.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create recipe')
  }

  const recipe = await recipeRes.json()

  // Step 2 — Create the community post linked to that recipe
  const postPayload = {
    recipe_id: recipe.id,
    caption: postData.caption || null,
  }
  if (postData.video_url) {
    postPayload.video_url = postData.video_url
  } else if (postData.cover_photo_url) {
    postPayload.cover_photo_url = postData.cover_photo_url
  }

  try {
    const postRes = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(postPayload),
    })

    if (!postRes.ok) {
      const err = await postRes.json().catch(() => ({}))
      let detailMsg = 'Failed to create post'
      if (typeof err.detail === 'string') {
        detailMsg = err.detail
      } else if (Array.isArray(err.detail) && err.detail.length > 0) {
        detailMsg = err.detail[0].msg || JSON.stringify(err.detail)
      } else if (err.message) {
        detailMsg = err.message
      }
      throw new Error(detailMsg)
    }

    const postDataResponse = await postRes.json()
    return postDataResponse
  } catch (error) {
    // If step 2 (POST /posts) fails, delete the recipe that was just created
    await fetch(`${BASE_URL}/recipes/${recipe.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {})

    throw error
  }
}

/**
 * Fetch all community posts (public feed).
 */
export async function getCommunityFeed(token) {
  const headers = {}
  const authToken = token || localStorage.getItem('recilink_token')
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  const res = await fetch(`${BASE_URL}/posts`, { headers })
  if (!res.ok) throw new Error('Failed to fetch community feed')
  return res.json()
}

/**
 * Fetch a single community post by ID.
 */
export async function getPostById(postId, token) {
  const headers = {}
  const authToken = token || localStorage.getItem('recilink_token')
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  const res = await fetch(`${BASE_URL}/posts/${postId}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to fetch post')
  }
  return res.json()
}

/**
 * Update an existing post and its linked recipe.
 */
export async function updateRecipePost(postId, payload, token) {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to update post')
  }

  return res.json()
}

/**
 * Delete a post (and its linked recipe if owned).
 */
export async function deleteRecipePost(postId, token) {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to delete post')
  }

  return true
}

export const getPersonalizedPostFeed = (token) =>
  API.get('/posts/feed/personalized', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })

/**
 * Upload image or video to /uploads endpoint with progress reporting and abort support.
 */
export function uploadMedia(file, token, onProgress = null, signal = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()

    const isVideo = file.type?.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name)
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name)

    let fileToSend = file
    if ((!file.type || file.type === 'application/octet-stream') && isVideo) {
      fileToSend = new File([file], file.name, { type: 'video/mp4' })
    } else if ((!file.type || file.type === 'application/octet-stream') && isImage) {
      fileToSend = new File([file], file.name, { type: 'image/jpeg' })
    }
    formData.append('file', fileToSend)

    const authToken = token || localStorage.getItem('recilink_token')

    let aborted = false

    if (signal) {
      if (signal.aborted) {
        return reject(new DOMException('Upload aborted', 'AbortError'))
      }
      signal.addEventListener('abort', () => {
        aborted = true
        xhr.abort()
        reject(new DOMException('Upload aborted', 'AbortError'))
      })
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      if (aborted) return
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch (e) {}


      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        const msg = data.detail || (xhr.status === 413 ? 'File too large' : `Upload failed with status ${xhr.status}`)
        reject(new Error(msg))
      }
    }

    xhr.onerror = (e) => {
      if (aborted) return
      reject(new Error('Network error during upload. Please check your server connection.'))
    }

    xhr.onabort = () => {
      if (!aborted) {
        reject(new DOMException('Upload aborted', 'AbortError'))
      }
    }

    xhr.open('POST', `${BASE_URL}/uploads`)
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    }
    xhr.send(formData)
  })
}
