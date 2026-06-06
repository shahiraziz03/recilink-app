import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createRecipePost } from '../api/posts'

const CUISINES = [
  'Malaysian', 'Chinese', 'Indian', 'Western', 'Japanese',
  'Korean', 'Thai', 'Italian', 'Mexican', 'Middle Eastern', 'Other'
]

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard']

const SUGGESTED_TAGS = [
  'halal', 'vegetarian', 'vegan', 'gluten-free', 'spicy',
  'healthy', 'quick', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack'
]

const STEPS = [
  { id: 'details', label: 'Recipe Details', icon: '📋' },
  { id: 'ingredients', label: 'Ingredients', icon: '🥗' },
  { id: 'steps', label: 'Cooking Steps', icon: '👨‍🍳' },
  { id: 'post', label: 'Post & Share', icon: '🚀' }
]

export default function PostRecipe() {
  const navigate = useNavigate()
  const { token, user } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Recipe fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [customCuisine, setCustomCuisine] = useState('') // New custom other input state
  const [difficulty, setDifficulty] = useState('Medium')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState(4)
  const [ingredients, setIngredients] = useState(['', ''])
  const [cookingSteps, setCookingSteps] = useState([''])
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')

  // Post fields
  const [caption, setCaption] = useState('')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('')
  const [coverPreview, setCoverPreview] = useState(null)

  // ── Ingredient helpers ─────────────────────────────────
  const addIngredient = () => setIngredients([...ingredients, ''])
  const removeIngredient = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i))
  const updateIngredient = (i, val) => {
    const next = [...ingredients]
    next[i] = val
    setIngredients(next)
  }

  // ── Step helpers ───────────────────────────────────────
  const addStep = () => setCookingSteps([...cookingSteps, ''])
  const removeStep = (i) => setCookingSteps(cookingSteps.filter((_, idx) => idx !== i))
  const updateStep = (i, val) => {
    const next = [...cookingSteps]
    next[i] = val
    setCookingSteps(next)
  }

  // ── Tag helpers ────────────────────────────────────────
  const addTag = (tag) => {
    const clean = tag.trim().toLowerCase()
    if (clean && !tags.includes(clean)) setTags([...tags, clean])
    setTagInput('')
  }
  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag))

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  // ── Cover photo URL preview ────────────────────────────
  const handleCoverUrlChange = (val) => {
    setCoverPhotoUrl(val)
    setCoverPreview(val || null)
  }

  // Get final calculated cuisine value
  const getSelectedCuisine = () => {
    if (cuisine === 'Other') {
      return customCuisine.trim() || 'Other'
    }
    return cuisine
  }

  // ── Step validation ────────────────────────────────────
  const canProceed = () => {
    if (currentStep === 0) {
      const validCuisine = cuisine === 'Other' ? customCuisine.trim().length > 0 : cuisine !== ''
      return title.trim().length > 0 && validCuisine
    }
    if (currentStep === 1) return ingredients.some((i) => i.trim())
    if (currentStep === 2) return cookingSteps.some((s) => s.trim())
    return true
  }

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token) {
      setError('You must be logged in to post a recipe.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const recipeData = {
        title: title.trim(),
        description: description.trim() || null,
        cuisine: getSelectedCuisine(),
        difficulty,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        servings: parseInt(servings),
        ingredients: ingredients.filter((i) => i.trim()),
        steps: cookingSteps.filter((s) => s.trim()),
        tags: tags.length ? tags : null,
        image_url: coverPhotoUrl.trim() || null,
        source: 'user',
      }

      const postData = {
        caption: caption.trim() || null,
        cover_photo_url: coverPhotoUrl.trim() || null,
      }

      await createRecipePost(recipeData, postData, token)
      setSubmitSuccess(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f6]">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center mx-auto shadow-xl animate-bounce-once">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Recipe Posted! 🎉
            </h2>
            <p className="text-[#8d7168] mt-2">Your recipe is now live on the community feed.</p>
          </div>
          <div className="w-48 h-1.5 bg-[#ffe9e3] rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-[#FF6B35] rounded-full animate-progress" />
          </div>
          <p className="text-sm text-[#8d7168]">Redirecting to home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fff8f6] py-8 px-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Share Your Recipe
            </h1>
            <p className="text-sm text-[#8d7168]">Let the world taste your culinary masterpiece</p>
          </div>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                className={`flex flex-col items-center gap-1.5 group transition-all duration-300 ${
                  idx <= currentStep ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                  idx < currentStep
                    ? 'bg-[#FF6B35] text-white scale-95'
                    : idx === currentStep
                    ? 'bg-[#FF6B35] text-white ring-4 ring-[#FF6B35]/20 scale-110'
                    : 'bg-white border-2 border-[#e1bfb5] text-[#8d7168]'
                }`}>
                  {idx < currentStep ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${
                  idx === currentStep ? 'text-[#FF6B35]' : idx < currentStep ? 'text-[#594139]' : 'text-[#8d7168]'
                }`}>
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-500 ${
                  idx < currentStep ? 'bg-[#FF6B35]' : 'bg-[#e1bfb5]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card container */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-[#f7ddd5] overflow-hidden">

          {/* ── STEP 0: Recipe Details ────────────────────────── */}
          {currentStep === 0 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Recipe Details</h2>
                  <p className="text-sm text-[#8d7168]">Tell us about your dish</p>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Recipe Name *</label>
                <input
                  id="recipe-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mum's Nasi Lemak"
                  className="input-field text-base"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Description</label>
                <textarea
                  id="recipe-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this recipe special?"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {/* Cuisine + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Cuisine *</label>
                  <div className="space-y-2">
                    <select
                      id="recipe-cuisine"
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Cuisine</option>
                      {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Custom text field showing if "Other" is picked */}
                    {cuisine === 'Other' && (
                      <input
                        id="recipe-custom-cuisine"
                        type="text"
                        value={customCuisine}
                        onChange={(e) => setCustomCuisine(e.target.value)}
                        placeholder="Type custom cuisine (e.g. Nyonya, Peranakan)"
                        className="input-field text-sm animate-fade-in"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Difficulty</label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <button
                        key={d}
                        id={`difficulty-${d.toLowerCase()}`}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                          difficulty === d
                            ? 'bg-[#FF6B35] text-white shadow-sm scale-105'
                            : 'bg-[#fff1ed] text-[#594139] hover:bg-[#ffe9e3]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Times + Servings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Prep Time</label>
                  <div className="relative">
                    <input
                      id="recipe-prep-time"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="15"
                      min="0"
                      className="input-field pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8d7168] font-medium">min</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Cook Time</label>
                  <div className="relative">
                    <input
                      id="recipe-cook-time"
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="30"
                      min="0"
                      className="input-field pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8d7168] font-medium">min</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Servings</label>
                  <input
                    id="recipe-servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    min="1"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Ingredients ───────────────────────────── */}
          {currentStep === 1 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🥗</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Ingredients</h2>
                  <p className="text-sm text-[#8d7168]">List everything you'll need</p>
                </div>
              </div>

              <div className="space-y-3">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-3 group">
                    <div className="w-7 h-7 rounded-full bg-[#ffe9e3] flex items-center justify-center text-xs font-bold text-[#FF6B35] flex-shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      id={`ingredient-${idx}`}
                      type="text"
                      value={ing}
                      onChange={(e) => updateIngredient(idx, e.target.value)}
                      placeholder={`e.g. ${idx === 0 ? '2 cups coconut milk' : idx === 1 ? '1 cup jasmine rice' : 'Ingredient ' + (idx + 1)}`}
                      className="input-field flex-1"
                    />
                    {ingredients.length > 1 && (
                      <button
                        id={`remove-ingredient-${idx}`}
                        type="button"
                        onClick={() => removeIngredient(idx)}
                        className="w-8 h-8 rounded-full bg-[#fde3db] hover:bg-red-100 text-[#8d7168] hover:text-red-500 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                id="add-ingredient-btn"
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-2 text-sm font-semibold text-[#FF6B35] hover:text-[#e55928] transition-colors duration-200 mt-2"
              >
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-[#FF6B35] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Add Ingredient
              </button>

              {/* Progress indicator */}
              <div className="bg-[#fff1ed] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#FF6B35]">{ingredients.filter(i => i.trim()).length}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#261814]">ingredients added</p>
                  <p className="text-xs text-[#8d7168]">Aim for 3+ for best results</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Cooking Steps ─────────────────────────── */}
          {currentStep === 2 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">👨‍🍳</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Cooking Steps</h2>
                  <p className="text-sm text-[#8d7168]">Walk others through your process</p>
                </div>
              </div>

              <div className="space-y-4">
                {cookingSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center text-white text-sm font-bold shadow-sm mt-2">
                      {idx + 1}
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        id={`cooking-step-${idx}`}
                        value={step}
                        onChange={(e) => updateStep(idx, e.target.value)}
                        placeholder={
                          idx === 0
                            ? 'e.g. Wash the rice and soak for 30 minutes...'
                            : idx === 1
                            ? 'e.g. Bring coconut milk to a gentle simmer...'
                            : `Step ${idx + 1}...`
                        }
                        rows={2}
                        className="input-field resize-none w-full"
                      />
                      {cookingSteps.length > 1 && (
                        <button
                          id={`remove-step-${idx}`}
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#fde3db] hover:bg-red-100 text-[#8d7168] hover:text-red-500 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                id="add-step-btn"
                type="button"
                onClick={addStep}
                className="flex items-center gap-2 text-sm font-semibold text-[#FF6B35] hover:text-[#e55928] transition-colors duration-200"
              >
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-[#FF6B35] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Add Step
              </button>
            </div>
          )}

          {/* ── STEP 3: Post & Share ──────────────────────────── */}
          {currentStep === 3 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🚀</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Post & Share</h2>
                  <p className="text-sm text-[#8d7168]">Add a photo and caption to share with the community</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Left: Form */}
                <div className="space-y-5">
                  {/* Cover Photo URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Cover Photo URL</label>
                    <input
                      id="cover-photo-url"
                      type="url"
                      value={coverPhotoUrl}
                      onChange={(e) => handleCoverUrlChange(e.target.value)}
                      placeholder="https://example.com/your-dish.jpg"
                      className="input-field"
                    />
                    <p className="text-xs text-[#8d7168]">Paste a direct image URL (JPG, PNG)</p>
                  </div>

                  {/* Caption */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Caption</label>
                    <textarea
                      id="post-caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Share the story behind this dish..."
                      rows={4}
                      className="input-field resize-none"
                    />
                    <p className={`text-xs text-right ${caption.length > 200 ? 'text-[#FF6B35]' : 'text-[#8d7168]'}`}>
                      {caption.length} / 280
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Tags</label>
                    <div className="input-field flex flex-wrap gap-2 min-h-[44px] items-center">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 bg-[#FF6B35] text-white text-xs font-medium px-3 py-1 rounded-full"
                        >
                          #{tag}
                          <button
                            id={`remove-tag-${tag}`}
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:opacity-70 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <input
                        id="tag-input"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={() => tagInput.trim() && addTag(tagInput)}
                        placeholder={tags.length === 0 ? 'Add tags...' : ''}
                        className="outline-none text-sm flex-1 min-w-[80px] bg-transparent"
                      />
                    </div>
                    {/* Suggested tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 6).map((tag) => (
                        <button
                          key={tag}
                          id={`suggested-tag-${tag}`}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="text-xs px-2.5 py-1 rounded-full border border-[#e1bfb5] text-[#594139] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Preview card */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Preview</p>
                  <div className="bg-white rounded-2xl border border-[#f7ddd5] overflow-hidden shadow-sm">
                    {/* Cover */}
                    <div className="h-44 bg-gradient-to-br from-[#ffe9e3] to-[#fde3db] flex items-center justify-center overflow-hidden relative">
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={() => setCoverPreview(null)}
                        />
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="text-4xl">📸</div>
                          <p className="text-xs text-[#8d7168]">Cover photo preview</p>
                        </div>
                      )}
                      {/* Difficulty badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm ${
                          difficulty === 'Easy' ? 'bg-emerald-500' :
                          difficulty === 'Medium' ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          {difficulty}
                        </span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-[#261814] text-sm" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                        {title || 'Your Recipe Title'}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[#8d7168]">
                        {getSelectedCuisine() && <span className="font-medium text-[#FF6B35]">{getSelectedCuisine()}</span>}
                        {prepTime && <span>⏱ {prepTime}m prep</span>}
                        {cookTime && <span>🔥 {cookTime}m cook</span>}
                      </div>
                      {caption && (
                        <p className="text-xs text-[#594139] line-clamp-2">{caption}</p>
                      )}
                      {/* Author */}
                      <div className="flex items-center gap-2 pt-1 border-t border-[#f7ddd5]">
                        <div className="w-6 h-6 rounded-full bg-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] text-xs font-bold">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-xs text-[#8d7168]">{user?.username || 'You'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Ingredients', value: ingredients.filter(i => i.trim()).length },
                      { label: 'Steps', value: cookingSteps.filter(s => s.trim()).length },
                      { label: 'Tags', value: tags.length },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-[#fff1ed] rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-[#FF6B35]">{stat.value}</p>
                        <p className="text-xs text-[#8d7168]">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation footer ─────────────────────────────── */}
          <div className="px-8 py-5 bg-[#fff8f6] border-t border-[#f7ddd5] flex items-center justify-between">
            <button
              id="step-back-btn"
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                currentStep === 0
                  ? 'text-[#c4a39a] cursor-not-allowed'
                  : 'text-[#594139] hover:bg-[#ffe9e3] hover:text-[#FF6B35]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Step indicator */}
            <div className="flex gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-6 bg-[#FF6B35]' : idx < currentStep ? 'w-1.5 bg-[#FF6B35]/40' : 'w-1.5 bg-[#e1bfb5]'
                  }`}
                />
              ))}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <button
                id="step-next-btn"
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  canProceed()
                    ? 'bg-[#FF6B35] text-white hover:bg-[#e55928] shadow-sm hover:shadow-md active:scale-95'
                    : 'bg-[#fde3db] text-[#c4a39a] cursor-not-allowed'
                }`}
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                id="submit-post-btn"
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !token}
                className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                  isSubmitting || !token
                    ? 'bg-[#fde3db] text-[#c4a39a] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FF6B35] to-[#ff9a72] text-white shadow-md hover:shadow-lg active:scale-95 hover:from-[#e55928] hover:to-[#FF6B35]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Posting...
                  </>
                ) : (
                  <>
                    Post Recipe
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Login prompt if no token */}
        {!token && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm text-amber-800">
              You need to{' '}
              <a href="/login" className="font-semibold text-[#FF6B35] hover:underline">log in</a>
              {' '}to post a recipe.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
