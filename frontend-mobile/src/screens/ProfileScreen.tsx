import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  FlatList, ActivityIndicator, Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const CARD_WIDTH = (Dimensions.get('window').width - 32 - 12) / 2;

const PROFILE_KEY = 'user_profile';
const SHOPPING_KEY = 'shopping_list';

// Graph constants (for Insights tab)
const GRAPH_RADIUS = 100;
const GRAPH_CENTER = { x: 160, y: 160 };
const SATELLITE_ANGLES = [300, 0, 60, 140, 210];
const NODE_COLORS = ['#93c5fd', '#86efac', '#fca5a5', '#fcd34d', '#c4b5fd'];
function getPos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: GRAPH_CENTER.x + GRAPH_RADIUS * Math.cos(rad), y: GRAPH_CENTER.y + GRAPH_RADIUS * Math.sin(rad) };
}

const decodeToken = (token: string): Partial<User> | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: parseInt(payload.sub), username: payload.username, email: '' };
  } catch { return null; }
};

type User = { id: number; username: string; email: string };
type Recipe = { id: number; title: string; image_url: string | null; prep_time: number | null; cook_time: number | null; cuisine: string | null; difficulty: string | null; saves_count?: number; comments_count?: number };
type Profile = { bio: string; dietary: string[] };

const TABS = ['My Recipes', 'Collections', 'Tagged', 'Insights'];
const DIET_OPTIONS = ['Plant-Based', 'Gluten-Free', 'Vegan', 'Halal', 'Mediterranean', 'Keto', 'Vegetarian'];

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({ bio: '', dietary: [] });
  const [myRecipes, setMyRecipes]       = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('My Recipes');
  const [editVisible, setEditVisible] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editDietary, setEditDietary] = useState<string[]>([]);
  const [cookingStreak, setCookingStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streakLoading, setStreakLoading] = useState(false);
  // Insights tab
  const [shoppingCount, setShoppingCount] = useState(0);
  const [topIngredient, setTopIngredient] = useState('');
  const [popularIngredients, setPopularIngredients] = useState<string[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [cooccurrences, setCooccurrences] = useState<{ ingredient: string; frequency: number }[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === 'Insights' && !insightsLoaded) {
      loadInsights();
    }
  }, [activeTab]);

  const loadInsights = async () => {
    // Shopping list stats
    try {
      const shopRaw = await AsyncStorage.getItem(SHOPPING_KEY);
      const shopItems: { id: string; name: string }[] = shopRaw ? JSON.parse(shopRaw) : [];
      setShoppingCount(shopItems.length);
      if (shopItems.length > 0) setTopIngredient(shopItems[0].name);
    } catch { /* silent */ }

    // Popular ingredients for graph
    try {
      const res = await apiClient.get('/recommendations/popular-ingredients');
      const ingredients: string[] = res.data.popular_ingredients.slice(0, 6);
      setPopularIngredients(ingredients);
      if (ingredients.length > 0) {
        setSelectedIngredient(ingredients[0]);
        loadCooccurrences(ingredients[0]);
      }
    } catch { /* silent */ }
    setInsightsLoaded(true);
  };

  const loadCooccurrences = async (ingredient: string) => {
    setGraphLoading(true);
    try {
      const res = await apiClient.get(`/recommendations/ingredients/${ingredient}/cooccurrences`);
      setCooccurrences(res.data.cooccurrences.slice(0, 5));
    } catch {
      setCooccurrences([]);
    } finally {
      setGraphLoading(false);
    }
  };

  const selectIngredient = (ing: string) => {
    setSelectedIngredient(ing);
    loadCooccurrences(ing);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadStreak();
    }, [])
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userRaw    = await AsyncStorage.getItem('user');
      const token      = await AsyncStorage.getItem('token');
      const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);

      let u: User | null = userRaw ? JSON.parse(userRaw) : null;
      if (!u && token) u = decodeToken(token) as User;

      if (u) {
        setUser(u);
        const [recipesRes, savedRes, socialProfileRes] = await Promise.all([
          apiClient.get('/recipes', { params: { page: 1, limit: 50 } }),
          apiClient.get('/social/recipes/saved').catch(() => ({ data: [] })),
          apiClient.get(`/social/users/${u.id}/profile`).catch(() => ({ data: null })),
        ]);
        setMyRecipes(recipesRes.data.filter((r: any) => r.contributor_id === u!.id));
        setSavedRecipes(savedRes.data);
        if (socialProfileRes.data) {
          setFollowersCount(socialProfileRes.data.followers_count ?? 0);
          setFollowingCount(socialProfileRes.data.following_count ?? 0);
        }
      }

      if (profileRaw) setProfile(JSON.parse(profileRaw));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadStreak = async () => {
    try {
      const res = await apiClient.get('/profile/streak');
      setCookingStreak(res.data.cooking_streak);
      setCheckedInToday(res.data.checked_in_today);
    } catch { /* silent */ }
  };

  const handleCheckin = async () => {
    setStreakLoading(true);
    try {
      const res = await apiClient.post('/profile/checkin');
      setCookingStreak(res.data.cooking_streak);
      setCheckedInToday(true);
      if (res.data.message === 'Already checked in today') {
        Alert.alert('Already Checked In', 'You have already checked in today. Keep it up!');
      } else {
        Alert.alert('Checked In!', `${res.data.cooking_streak} day streak — keep cooking!`);
      }
    } catch {
      Alert.alert('Error', 'Could not check in. Please try again.');
    } finally {
      setStreakLoading(false);
    }
  };

  const openEdit = () => {
    setEditBio(profile.bio);
    setEditDietary([...profile.dietary]);
    setEditVisible(true);
  };

  const saveEdit = async () => {
    const updated = { bio: editBio, dietary: editDietary };
    setProfile(updated);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    setEditVisible(false);
  };

  const toggleDiet = (tag: string) => {
    setEditDietary(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'user']);
          navigation.getParent()?.replace('Login');
        }
      },
    ]);
  };

  const removeFromSaved = async (id: number) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id));
    try { await apiClient.post(`/social/recipes/${id}/save`); } catch { /* silent */ }
  };

  const renderRecipeCard = ({ item, isSaved = false, isOwn = false }: { item: Recipe; isSaved?: boolean; isOwn?: boolean }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Community', { screen: 'RecipeDetail', params: { recipeId: item.id } })}
      style={{ width: CARD_WIDTH, margin: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', elevation: 1, borderWidth: 1, borderColor: '#f3f4f6' }}
    >
      <Image
        source={{ uri: item.image_url || 'https://placehold.co/300x200/FE6B36/white?text=Recipe' }}
        style={{ width: '100%', height: 110 }}
        resizeMode="cover"
      />
      {/* Heart / edit overlay */}
      {isOwn ? (
        <TouchableOpacity
          onPress={() => navigation.navigate('EditRecipe', { recipe: item })}
          style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'white', borderRadius: 14, padding: 5, elevation: 2 }}
        >
          <Ionicons name="pencil" size={13} color="#FE6B36" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => isSaved ? removeFromSaved(item.id) : null}
          style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'white', borderRadius: 14, padding: 5, elevation: 2 }}
        >
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={14} color={isSaved ? '#FE6B36' : '#9ca3af'} />
        </TouchableOpacity>
      )}
      <View style={{ padding: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }} numberOfLines={2}>{item.title}</Text>
        <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
          {(item.prep_time ?? 0) + (item.cook_time ?? 0)} min • {item.cuisine ?? 'General'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 30, height: 30, backgroundColor: '#FE6B36', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>R</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>ReciLink</Text>
        </View>
        <TouchableOpacity style={{ padding: 4 }}>
          <Ionicons name="notifications-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 }}>
          {/* Avatar */}
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 34 }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Text>
            <TouchableOpacity onPress={openEdit} style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 2, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Ionicons name="pencil" size={12} color="#FE6B36" />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 }}>{user?.username ?? 'Chef'}</Text>

          {/* Bio */}
          {profile.bio ? (
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16, paddingHorizontal: 10 }}>
              {profile.bio}
            </Text>
          ) : (
            <TouchableOpacity onPress={openEdit} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#d1d5db', fontStyle: 'italic' }}>Tap to add a bio...</Text>
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={{ flexDirection: 'row', backgroundColor: '#fff7ed', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginBottom: 16, borderWidth: 1, borderColor: '#fed7aa', gap: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{myRecipes.length}</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>RECIPES</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#fed7aa' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{followersCount}</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>FOLLOWERS</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#fed7aa' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{savedRecipes.length}</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>SAVED</Text>
            </View>
          </View>

          {/* Cooking Streak card */}
          <View style={{ width: '100%', backgroundColor: checkedInToday ? '#fff7ed' : '#f9fafb', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 16, borderWidth: 1, borderColor: checkedInToday ? '#fed7aa' : '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 28 }}>{checkedInToday ? '🔥' : '🍳'}</Text>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{cookingStreak} {cookingStreak === 1 ? 'Day' : 'Days'}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>COOKING STREAK</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleCheckin}
              disabled={streakLoading}
              style={{ backgroundColor: checkedInToday ? '#d1fae5' : '#FE6B36', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, opacity: streakLoading ? 0.6 : 1 }}
            >
              <Text style={{ color: checkedInToday ? '#059669' : 'white', fontWeight: '700', fontSize: 13 }}>
                {checkedInToday ? 'Checked In' : 'Check In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, width: '100%' }}>
            <TouchableOpacity
              onPress={openEdit}
              style={{ flex: 1, backgroundColor: '#FE6B36', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="log-out-outline" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Dietary tags */}
          {profile.dietary.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {profile.dietary.map(tag => (
                <View key={tag} style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '600' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6' }}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? '#FE6B36' : 'transparent' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab ? '#FE6B36' : '#9ca3af' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'My Recipes' && (
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#FE6B36" />
            </View>
          ) : myRecipes.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="restaurant-outline" size={40} color="#e5e7eb" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>No recipes posted yet</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Post')}
                style={{ marginTop: 14, backgroundColor: '#FE6B36', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Share a Recipe</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={myRecipes}
              numColumns={2}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => renderRecipeCard({ item, isSaved: false, isOwn: true })}
              scrollEnabled={false}
              contentContainerStyle={{ padding: 10 }}
            />
          )
        )}

        {activeTab === 'Collections' && (
          savedRecipes.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="bookmark-outline" size={40} color="#e5e7eb" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>No saved recipes yet</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Community')}
                style={{ marginTop: 14, backgroundColor: '#FE6B36', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Browse Recipes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={savedRecipes}
              numColumns={2}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => renderRecipeCard({ item, isSaved: true })}
              scrollEnabled={false}
              contentContainerStyle={{ padding: 10 }}
            />
          )
        )}

        {activeTab === 'Tagged' && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="pricetag-outline" size={40} color="#e5e7eb" />
            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>No tagged recipes</Text>
          </View>
        )}

        {activeTab === 'Insights' && (
          <View style={{ padding: 16 }}>
            {/* Shopping stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: '#fff7ed', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fed7aa' }}>
                <Ionicons name="basket-outline" size={22} color="#FE6B36" />
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 8 }}>{shoppingCount}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shopping Items</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
                <Ionicons name="leaf-outline" size={22} color="#22c55e" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 8, textTransform: 'capitalize' }} numberOfLines={1}>
                  {topIngredient || 'N/A'}
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Top Ingredient</Text>
              </View>
            </View>

            {/* Ingredient graph */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', elevation: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 }}>Ingredient Co-occurrence</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Tap an ingredient to see what it pairs with.</Text>

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                {popularIngredients.map(ing => (
                  <TouchableOpacity
                    key={ing}
                    onPress={() => selectIngredient(ing)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      backgroundColor: selectedIngredient === ing ? '#FE6B36' : '#f3f4f6',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: selectedIngredient === ing ? 'white' : '#374151', textTransform: 'capitalize' }}>
                      {ing}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* SVG Graph */}
              <View style={{ alignItems: 'center' }}>
                {graphLoading ? (
                  <View style={{ height: 320, justifyContent: 'center' }}>
                    <ActivityIndicator color="#FE6B36" size="large" />
                  </View>
                ) : popularIngredients.length === 0 ? (
                  <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#9ca3af', fontSize: 13 }}>Cook more recipes to unlock your ingredient graph!</Text>
                  </View>
                ) : (
                  <Svg width={320} height={320} viewBox="0 0 320 320">
                    {cooccurrences.map((node, i) => {
                      const pos = getPos(SATELLITE_ANGLES[i] ?? i * 72);
                      return <Line key={`line-${i}`} x1={GRAPH_CENTER.x} y1={GRAPH_CENTER.y} x2={pos.x} y2={pos.y} stroke="#e5e7eb" strokeWidth={2} />;
                    })}
                    {cooccurrences.map((node, i) => {
                      const pos = getPos(SATELLITE_ANGLES[i] ?? i * 72);
                      const nodeR = Math.max(26, Math.min(40, 18 + node.frequency / 8));
                      return (
                        <React.Fragment key={`node-${i}`}>
                          <Circle cx={pos.x} cy={pos.y} r={nodeR} fill={NODE_COLORS[i % NODE_COLORS.length]} opacity={0.85} />
                          <SvgText x={pos.x} y={pos.y - 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#374151">
                            {node.ingredient.length > 8 ? node.ingredient.slice(0, 7) + '…' : node.ingredient}
                          </SvgText>
                          <SvgText x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize={8} fill="#6b7280">
                            ×{node.frequency}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                    <Circle cx={GRAPH_CENTER.x} cy={GRAPH_CENTER.y} r={52} fill="#FE6B36" />
                    <SvgText x={GRAPH_CENTER.x} y={GRAPH_CENTER.y - 10} textAnchor="middle" fontSize={10} fontWeight="700" fill="white">
                      {selectedIngredient.length > 10 ? selectedIngredient.slice(0, 9) + '…' : selectedIngredient}
                    </SvgText>
                    <SvgText x={GRAPH_CENTER.x} y={GRAPH_CENTER.y + 6} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.8)">co-occurs with</SvgText>
                    <SvgText x={GRAPH_CENTER.x} y={GRAPH_CENTER.y + 20} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.8)">{cooccurrences.length} ingredients</SvgText>
                  </Svg>
                )}
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Ingredient Co-occurrence Web</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={{ fontSize: 15, color: '#6b7280' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Edit Profile</Text>
            <TouchableOpacity onPress={saveEdit}>
              <Text style={{ fontSize: 15, color: '#FE6B36', fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Bio</Text>
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell the community about yourself..."
              placeholderTextColor="#9ca3af"
              multiline
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 }}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>Dietary Preferences</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {DIET_OPTIONS.map(tag => {
                const active = editDietary.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleDiet(tag)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      borderWidth: 1,
                      borderColor: active ? '#FE6B36' : '#e5e7eb',
                      backgroundColor: active ? '#FFF0EB' : '#fff',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FE6B36' : '#6b7280' }}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
