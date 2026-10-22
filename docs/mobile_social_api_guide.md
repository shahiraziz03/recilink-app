# ReciLink Mobile API Guide: Social Media & Personalized Feed Module

This reference document outlines all endpoints implemented for the Social Media, Community Feed, and Personalized Recommendation experience in ReciLink. Mobile consumes these endpoints against `http://<backend-host>:8000/api/v1`.

---

## 1. Feeds Screen (Community / Food Feed)

The feed now supports **4 tabs**:

### A. For You ✨ (Personalized Graph Recommendations)
- **Method & Path:** `GET /api/v1/posts/feed/personalized`
- **Headers:** `Authorization: Bearer <token>` *(Required)*
- **Algorithm:** Powered by Neo4j graph collaborative filtering + social graph boost (followed users' saves/likes) + cuisine affinity.
- **Response:** Array of posts matching the standard Post schema, but includes a `"reason"` field:
  ```json
  [
    {
      "id": 11,
      "caption": "Crispy fried chicken!",
      "cover_photo_url": "https://...",
      "created_at": "2026-10-20T10:00:00Z",
      "likes_count": 8,
      "is_liked": true,
      "reason": "Popular with cooks like you",
      "recipe": {
        "id": 58,
        "title": "Ayam Goreng Berempah",
        "cuisine": "Malaysian",
        "difficulty": "Easy",
        "image_url": "https://...",
        "prep_time": 15,
        "cook_time": 20,
        "contributor_id": 1,
        "contributor_username": "khairulaming",
        "saves_count": 12,
        "comments_count": 4
      },
      "posted_by": {
        "id": 1,
        "username": "khairulaming"
      }
    }
  ]
  ```
  *Possible `reason` values:*
  - `"Popular with cooks like you"` (both similar users and followed users engaged)
  - `"Saved by people you follow"` (from social graph)
  - `"Based on similar cooks"` (collaborative filtering)
  - `"Popular right now"` (fallback when user has no graph history yet)

### B. Explore Feed (Latest Posts)
- **Method & Path:** `GET /api/v1/posts`
- **Headers:** `Authorization: Bearer <token>` *(Optional — if passed, `is_liked` reflects logged-in user state)*
- **Response:** Array of posts ordered newest first.

### C. Trending Feed (Ranked by Engagement)
- **Method & Path:** `GET /api/v1/posts/trending`
- **Headers:** `Authorization: Bearer <token>` *(Optional)*
- **Response:** Array of posts sorted by engagement (`likes_count + comments_count`).

### D. Following Feed (Only Followed Creators)
- **Method & Path:** `GET /api/v1/posts/feed/following`
- **Headers:** `Authorization: Bearer <token>` *(Required)*
- **Response:** Array of posts exclusively from accounts the user follows.

---

## 2. Post Likes System (❤️ Instagram-Style)

### Toggle Like / Unlike Post
- **Method & Path:** `POST /api/v1/social/posts/{post_id}/like`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "liked": true,
    "likes_count": 15
  }
  ```

---

## 3. Single Post Detail (Deep Linking & Modals)

- **Method & Path:** `GET /api/v1/posts/{post_id}`
- **Headers:** `Authorization: Bearer <token>` *(Optional)*
- **Response:** Single full `PostResponse` object with nested recipe and author.

---

## 4. Public User Profile Screen (`/users/:id`)

### A. User Profile Header & Stats
- **Method & Path:** `GET /api/v1/social/users/{user_id}/profile`
- **Headers:** `Authorization: Bearer <token>` *(Optional — if passed, `is_following` is calculated)*
- **Response:**
  ```json
  {
    "id": 1,
    "username": "khairulaming",
    "bio": "Sambal Nyet Berapi creator & Malaysian home cook",
    "avatar_url": null,
    "cooking_streak": 7,
    "recipes_count": 14,
    "followers_count": 128,
    "following_count": 12,
    "is_following": false
  }
  ```

### B. User's Posts Grid
- **Method & Path:** `GET /api/v1/social/users/{user_id}/posts`
- **Response:**
  ```json
  [
    {
      "id": 11,
      "cover_photo_url": "https://...",
      "recipe_image_url": "https://...",
      "recipe_title": "Sambal Nasi Lemak Sambal Sedap",
      "recipe_cuisine": "Malaysian",
      "recipe_difficulty": "Medium",
      "likes_count": 8,
      "comments_count": 4,
      "created_at": "2026-10-19T20:30:00Z"
    }
  ]
  ```

### C. User's Recipes List
- **Method & Path:** `GET /api/v1/social/users/{user_id}/recipes`
- **Response:** Array of recipes created by this user.

---

## 5. Followers & Following Lists (Clickable Modals)

### A. Followers List
- **Method & Path:** `GET /api/v1/social/users/{user_id}/followers`
- **Response:**
  ```json
  [
    {
      "id": 2,
      "username": "shahir",
      "avatar_url": null,
      "bio": "Food enthusiast from KL"
    }
  ]
  ```

### B. Following List
- **Method & Path:** `GET /api/v1/social/users/{user_id}/following`
- **Response:** Same schema as followers.

---

## 6. Follow & Unfollow Actions

- **Follow User:**
  - `POST /api/v1/social/users/{user_id}/follow`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"following": true}`

- **Unfollow User:**
  - `DELETE /api/v1/social/users/{user_id}/follow`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"following": false}`

---

## 7. Direct Recipe Personalization (Optional Widget)

If mobile wants a dedicated "Personalized Recipes" horizontal list or discovery widget:
- **Method & Path:** `GET /api/v1/recommendations/personalized`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** List of recipes ranked with `combined_score` and `reason`.
