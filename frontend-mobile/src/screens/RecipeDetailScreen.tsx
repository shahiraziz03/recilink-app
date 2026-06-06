import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity,
  Alert, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const SHOPPING_KEY = 'shopping_list';

type Recipe = {
  id: number; title: string; description: string | null;
  cuisine: string | null; difficulty: string | null;
  prep_time: number | null; cook_time: number | null; servings: number | null;
  ingredients: string[]; steps: string[]; tags: string[] | null;
  image_url: string | null; contributor_id: number | null;
  contributor_username: string | null;
  saves_count: number; comments_count: number;
};
type Comment = { id: number; user_id: number; username: string; content: string; created_at: string };
type ShoppingItem = { id: string; name: string; checked: boolean; category: string };

const difficultyColor: Record<string, string> = {
  Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444',
};

export default function RecipeDetailScreen({ route, navigation }: any) {
  const { recipeId } = route.params;

  const [recipe, setRecipe]         = useState<Recipe | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Ingredient cart
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [addedToCart, setAddedToCart] = useState<Set<number>>(new Set());

  // Save / like
  const [saved, setSaved]           = useState(false);
  const [savesCount, setSavesCount] = useState(0);
  const [saveLoading, setSaveLoading] = useState(false);

  // Comments
  const [commentsModal, setCommentsModal] = useState(false);
  const [comments, setComments]           = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment]       = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then(raw => {
      if (raw) setCurrentUserId(JSON.parse(raw).id ?? null);
    });

    Promise.all([
      apiClient.get(`/recipes/${recipeId}`),
      apiClient.get(`/social/recipes/${recipeId}/is-saved`).catch(() => ({ data: { saved: false } })),
    ]).then(([recipeRes, savedRes]) => {
      const r: Recipe = recipeRes.data;
      setRecipe(r);
      setSavesCount(r.saves_count ?? 0);
      setSaved(savedRes.data.saved ?? false);
      setSelected(new Set(r.ingredients.map((_: any, i: number) => i)));
    }).catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleToggleSave = async () => {
    if (saveLoading) return;
    setSaveLoading(true);
    try {
      const res = await apiClient.post(`/social/recipes/${recipeId}/save`);
      setSaved(res.data.saved);
      setSavesCount(res.data.saves_count);
    } catch { /* silent */ }
    finally { setSaveLoading(false); }
  };

  const openComments = async () => {
    setCommentsModal(true);
    setCommentsLoading(true);
    try {
      const res = await apiClient.get(`/social/recipes/${recipeId}/comments`);
      setComments(res.data);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  };

  const submitComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setPostingComment(true);
    try {
      const res = await apiClient.post(`/social/recipes/${recipeId}/comments`, { content: text });
      setComments(prev => [...prev, res.data]);
      setNewComment('');
      if (recipe) setRecipe({ ...recipe, comments_count: (recipe.comments_count ?? 0) + 1 });
    } catch {
      Alert.alert('Error', 'Could not post comment.');
    } finally { setPostingComment(false); }
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (!recipe) return;
    const toAdd = recipe.ingredients.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) { Alert.alert('None selected', 'Select at least one ingredient.'); return; }
    try {
      const raw = await AsyncStorage.getItem(SHOPPING_KEY);
      const existing: ShoppingItem[] = raw ? JSON.parse(raw) : [];
      const existingNames = new Set(existing.map(i => i.name.toLowerCase()));
      const newItems: ShoppingItem[] = toAdd
        .filter(ing => !existingNames.has(ing.toLowerCase()))
        .map(ing => ({ id: Date.now().toString() + Math.random(), name: ing.charAt(0).toUpperCase() + ing.slice(1), checked: false, category: 'Produce' }));
      await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify([...existing, ...newItems]));
      setAddedToCart(new Set(recipe.ingredients.map((_, i) => i).filter(i => selected.has(i))));
      const skipped = toAdd.length - newItems.length;
      Alert.alert('Added!', `${newItems.length} ingredient${newItems.length !== 1 ? 's' : ''} added${skipped > 0 ? ` (${skipped} already in list)` : ''}.`,
        [{ text: 'View List', onPress: () => navigation.navigate('Match') }, { text: 'OK' }]);
    } catch { Alert.alert('Error', 'Could not save to shopping list.'); }
  };

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff8f6' }}>
        <ActivityIndicator size="large" color="#FE6B36" />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f6', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
        <Text style={{ color: '#9ca3af', marginTop: 12 }}>Recipe not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#FE6B36', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff8f6' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: recipe.image_url || 'https://placehold.co/600x400/FE6B36/white?text=Recipe' }}
            style={{ width: '100%', height: 260 }}
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ position: 'absolute', top: 48, left: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 8, elevation: 2 }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Title */}
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 }}>{recipe.title}</Text>

          {/* Owner row */}
          {recipe.contributor_username && (
            <TouchableOpacity
              onPress={() => {
                if (recipe.contributor_id === currentUserId) {
                  // Own recipe — go to own profile tab
                  navigation.getParent()?.navigate('Profile');
                } else {
                  navigation.navigate('PublicProfile', { userId: recipe.contributor_id });
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>
                  {recipe.contributor_username[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{recipe.contributor_username}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                  {recipe.contributor_id === currentUserId ? 'Your profile' : 'View profile →'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Social bar: save + comments */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, elevation: 1 }}>
            <TouchableOpacity onPress={handleToggleSave} disabled={saveLoading} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? '#FE6B36' : '#9ca3af'} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: saved ? '#FE6B36' : '#9ca3af' }}>{savesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openComments} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={20} color="#9ca3af" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#9ca3af' }}>{recipe.comments_count ?? 0}</Text>
            </TouchableOpacity>
          </View>

          {/* Badges */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {recipe.cuisine ? (
              <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: '#FE6B36', fontSize: 12, fontWeight: '600' }}>{recipe.cuisine}</Text>
              </View>
            ) : null}
            {recipe.difficulty ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: (difficultyColor[recipe.difficulty] ?? '#6b7280') + '20' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: difficultyColor[recipe.difficulty] ?? '#6b7280' }}>{recipe.difficulty}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 1 }}>
            {recipe.prep_time ? (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="cut-outline" size={20} color="#FE6B36" />
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Prep</Text>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 13 }}>{recipe.prep_time} min</Text>
              </View>
            ) : null}
            {recipe.cook_time ? (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f3f4f6' }}>
                <Ionicons name="flame-outline" size={20} color="#FE6B36" />
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Cook</Text>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 13 }}>{recipe.cook_time} min</Text>
              </View>
            ) : null}
            {recipe.servings ? (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={20} color="#FE6B36" />
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Serves</Text>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 13 }}>{recipe.servings}</Text>
              </View>
            ) : null}
          </View>

          {recipe.description ? (
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 20 }}>{recipe.description}</Text>
          ) : null}

          {/* Ingredients */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Ingredients</Text>
          </View>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, elevation: 1 }}>
            {recipe.ingredients.map((ing, i) => {
              const isSelected = selected.has(i);
              const isAdded    = addedToCart.has(i);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleSelect(i)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: i < recipe.ingredients.length - 1 ? 1 : 0, borderBottomColor: '#f9fafb' }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? '#FE6B36' : '#d1d5db', backgroundColor: isSelected ? '#FE6B36' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="white" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: '#374151', textTransform: 'capitalize' }}>{ing}</Text>
                  {isAdded && <Ionicons name="cart" size={15} color="#FE6B36" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setSelected(new Set(recipe.ingredients.map((_, i) => i)))}>
              <Text style={{ fontSize: 12, color: '#FE6B36', fontWeight: '600' }}>Select all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelected(new Set())}>
              <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '600' }}>Deselect all</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleAddToCart}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FE6B36', borderRadius: 14, paddingVertical: 15, marginBottom: 24, elevation: 2 }}
          >
            <Ionicons name="cart-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
              Add {selected.size} ingredient{selected.size !== 1 ? 's' : ''} to Shopping List
            </Text>
          </TouchableOpacity>

          {/* Steps */}
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 }}>Steps</Text>
          <View style={{ marginBottom: 20 }}>
            {recipe.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2, flexShrink: 0 }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 1 }}>
                  <Text style={{ color: '#374151', fontSize: 14, lineHeight: 20 }}>{step}</Text>
                </View>
              </View>
            ))}
          </View>

          {recipe.tags && recipe.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {recipe.tags.map((tag, i) => (
                <View key={i} style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Similar recipes banner */}
          <TouchableOpacity
            onPress={() => navigation.navigate('SimilarRecipes', { recipeId: recipe.id, recipeTitle: recipe.title })}
            style={{
              backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 32,
              borderWidth: 1.5, borderColor: '#FE6B36',
              flexDirection: 'row', alignItems: 'center', gap: 14,
              shadowColor: '#FE6B36', shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
            }}
            activeOpacity={0.85}
          >
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF0EB', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={22} color="#FE6B36" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 2 }}>
                Like this recipe?
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 17 }}>
                Find similar ones using our ingredient graph
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FE6B36" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Comments Modal */}
      <Modal visible={commentsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCommentsModal(false)}>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
            {/* Modal header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsModal(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Comments list */}
            {commentsLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#FE6B36" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={c => c.id.toString()}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingTop: 60 }}>
                    <Text style={{ fontSize: 32, marginBottom: 12 }}>💬</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>No comments yet</Text>
                    <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Be the first to share your thoughts!</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', marginBottom: 16, gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FE6B3620', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ color: '#FE6B36', fontWeight: '800', fontSize: 13 }}>
                        {item.username[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{item.username}</Text>
                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>{formatTime(item.created_at)}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>{item.content}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Add comment input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
              <TextInput
                ref={commentInputRef}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Write a comment…"
                placeholderTextColor="#9ca3af"
                multiline
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 80 }}
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={postingComment || !newComment.trim()}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: newComment.trim() ? '#FE6B36' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
              >
                {postingComment
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="send" size={18} color={newComment.trim() ? 'white' : '#9ca3af'} />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
