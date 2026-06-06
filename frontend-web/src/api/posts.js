const BASE_URL = 'http://localhost:8000/api/v1'

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
    const err = await recipeRes.json()
    throw new Error(err.detail || 'Failed to create recipe')
  }

  const recipe = await recipeRes.json()

  // Step 2 — Create the community post linked to that recipe
  const postRes = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipe_id: recipe.id,
      caption: postData.caption,
      cover_photo_url: postData.cover_photo_url || null,
    }),
  })

  if (!postRes.ok) {
    const err = await postRes.json()
    throw new Error(err.detail || 'Failed to create post')
  }

  return postRes.json()
}

/**
 * Fetch all community posts (public feed).
 */
export async function getCommunityFeed() {
  const res = await fetch(`${BASE_URL}/posts`)
  if (!res.ok) throw new Error('Failed to fetch community feed')
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

  return true;
}
