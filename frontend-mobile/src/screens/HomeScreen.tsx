import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Image, Alert, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

type User = { id: number; username: string; email: string };
type Recipe = {
  id: number;
  title: string;
  cuisine: string | null;
  difficulty: string | null;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  saves_count: number;
  comments_count: number;
};

// Streak card — defined OUTSIDE HomeScreen so its reference is stable and
// ListHeaderComponent never remounts it unexpectedly.
const StreakSection = React.memo(function StreakSection({
  streak, checkedInToday, streakLoading, onCheckin,
}: {
  streak: number;
  checkedInToday: boolean;
  streakLoading: boolean;
  onCheckin: () => void;
}) {
  const STREAK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const active = Math.min(streak, 7);
  return (
    <View>
      <View style={{ marginHorizontal: 16, backgroundColor: checkedInToday ? '#fff7ed' : '#fff', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: checkedInToday ? '#fed7aa' : '#f3f4f6', elevation: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>Cooking Streak 🔥</Text>
          <TouchableOpacity
            onPress={onCheckin}
            disabled={streakLoading}
            style={{ backgroundColor: checkedInToday ? '#d1fae5' : '#FE6B36', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14, opacity: streakLoading ? 0.6 : 1 }}
          >
            {streakLoading ? (
              <ActivityIndicator size="small" color={checkedInToday ? '#059669' : 'white'} />
            ) : (
              <Text style={{ color: checkedInToday ? '#059669' : 'white', fontWeight: '700', fontSize: 13 }}>
                {checkedInToday ? 'Checked In ✓' : 'Check In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {STREAK_DAYS.slice(0, 5).map((day, i) => (
              <View key={i} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: i < active ? '#FE6B36' : '#f3f4f6' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: i < active ? 'white' : '#9ca3af' }}>{day}</Text>
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{streak} {streak === 1 ? 'Day' : 'Days'}</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>Current Streak</Text>
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>All Recipes</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Browse our full collection</Text>
      </View>
    </View>
  );
});

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streakLoading, setStreakLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Stable refs so callbacks don't need these as deps
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  // Streak ref keeps listHeader stable so FlatList never remounts the header
  const streakDataRef = useRef({ streak: 0, checkedInToday: false, streakLoading: false });
  const handleCheckinRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      loadUser();
      loadStreak();
    }, [])
  );

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    fetchRecipes(true);
  }, [search]);

  const loadUser = async () => {
    const raw = await AsyncStorage.getItem('user');
    if (raw) setUser(JSON.parse(raw));
  };

  const loadStreak = async () => {
    try {
      const res = await apiClient.get('/profile/streak');
      setStreak(res.data.cooking_streak ?? 0);
      setCheckedInToday(res.data.checked_in_today ?? false);
    } catch { /* silent */ }
  };

  const fetchRecipes = useCallback(async (reset = false) => {
    if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) return;
    const currentPage = reset ? 1 : pageRef.current;
    reset ? setLoading(true) : setLoadingMore(true);
    loadingMoreRef.current = true;

    try {
      let data: Recipe[];
      if (search) {
        const res = await apiClient.get('/recipes/search', { params: { q: search, dataset_only: true } });
        data = res.data;
        hasMoreRef.current = false;
        setHasMore(false);
      } else {
        const res = await apiClient.get('/recipes', { params: { page: currentPage, limit: 20, dataset_only: true } });
        data = res.data;
        const more = data.length === 20;
        hasMoreRef.current = more;
        setHasMore(more);
        if (!reset) {
          pageRef.current = currentPage + 1;
          setPage(currentPage + 1);
        }
      }
      setRecipes(prev => {
        const existing = new Set(reset ? [] : prev.map(r => r.id));
        const unique = data.filter(r => !existing.has(r.id));
        return reset ? data : [...prev, ...unique];
      });
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingMoreRef.current = false;
    }
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    pageRef.current = 1;
    hasMoreRef.current = true;
    fetchRecipes(true);
  };

  const handleCheckin = async () => {
    setStreakLoading(true);
    try {
      const res = await apiClient.post('/profile/checkin');
      setStreak(res.data.cooking_streak);
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

  const totalTime = (r: Recipe) => (r.prep_time ?? 0) + (r.cook_time ?? 0);

  const renderRecipeCard = ({ item, index }: { item: Recipe; index: number }) => {
    const cardHeight = index % 2 === 0 ? 200 : 165;
    return (
      <TouchableOpacity
        style={{
          flex: 1, margin: 6, borderRadius: 16, overflow: 'hidden',
          backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        }}
        onPress={() => navigation.navigate('Community', { screen: 'RecipeDetail', params: { recipeId: item.id } })}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.image_url || 'https://placehold.co/300x200/FE6B36/white?text=Recipe' }}
            style={{ width: '100%', height: cardHeight }}
            resizeMode="cover"
          />
          {/* Time badge */}
          {totalTime(item) > 0 && (
            <View style={{
              position: 'absolute', bottom: 8, left: 8,
              backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Ionicons name="time-outline" size={11} color="white" />
              <Text style={{ color: 'white', fontSize: 11, marginLeft: 3, fontWeight: '600' }}>{totalTime(item)}m</Text>
            </View>
          )}
        </View>
        <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: '#111827' }} numberOfLines={2}>{item.title}</Text>
          {item.cuisine ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FE6B36', marginRight: 5 }} />
              <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>{item.cuisine}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // Keep refs in sync so stable callbacks always read fresh values
  streakDataRef.current = { streak, checkedInToday, streakLoading };
  handleCheckinRef.current = handleCheckin;

  // Stable onCheckin — won't change reference, won't break React.memo comparison
  const stableOnCheckin = useCallback(() => handleCheckinRef.current(), []);

  // Stable listHeader — empty deps means FlatList never unmounts/remounts the header.
  // StreakSection (React.memo) re-renders only when streak/checkedInToday/streakLoading changes.
  const listHeader = useCallback(() => (
    <StreakSection
      streak={streakDataRef.current.streak}
      checkedInToday={streakDataRef.current.checkedInToday}
      streakLoading={streakDataRef.current.streakLoading}
      onCheckin={stableOnCheckin}
    />
  ), []);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* ── Greeting + Search bar — OUTSIDE FlatList so keyboard never dismisses ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        {/* Greeting row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FE6B3620', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ color: '#FE6B36', fontWeight: '800', fontSize: 14 }}>
                {user?.username?.[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Good day,</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{user?.username ?? 'Chef'} 👋</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 30, height: 30, backgroundColor: '#FE6B36', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>R</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>ReciLink</Text>
          </View>
          <TouchableOpacity style={{ padding: 4 }}>
            <Ionicons name="notifications-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#374151' }}
            placeholder="Search 200,000+ recipes..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Recipe FlatList (streak card is ListHeaderComponent — no TextInput inside) ── */}
      <FlatList
        data={recipes}
        numColumns={2}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRecipeCard}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FE6B36" />}
        onEndReached={() => !search && fetchRecipes()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#FE6B36" style={{ paddingVertical: 16 }} /> : null}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator color="#FE6B36" size="large" />
            </View>
          ) : (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Ionicons name="restaurant-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 15 }}>No recipes found</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
