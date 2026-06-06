import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';

type Recipe = {
  id: number;
  title: string;
  cuisine: string | null;
  difficulty: string | null;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  contributor_id: number | null;
  saves_count: number;
  comments_count: number;
};

const CUISINES = ['All', 'Malaysian', 'Italian', 'Asian', 'Thai', 'General'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

export default function RecipesScreen({ navigation }: any) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [underThirty, setUnderThirty] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [saveCounts, setSaveCounts] = useState<Record<number, number>>({});

  const fetchRecipes = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (!reset && (loadingMore || !hasMore)) return;
    reset ? setLoading(true) : setLoadingMore(true);

    try {
      const isFiltered = search || cuisine !== 'All' || difficulty !== 'All';
      let data: Recipe[];

      if (isFiltered) {
        const res = await apiClient.get('/recipes/search', {
          params: {
            q: search || undefined,
            cuisine: cuisine !== 'All' ? cuisine : undefined,
            difficulty: difficulty !== 'All' ? difficulty : undefined,
          },
        });
        data = res.data;
        setHasMore(false);
      } else {
        const res = await apiClient.get('/recipes', { params: { page: currentPage, limit: 12 } });
        data = res.data;
        setRecipes(prev => {
          const existing = new Set(reset ? [] : prev.map(r => r.id));
          const unique = data.filter(r => !existing.has(r.id));
          return reset ? data : [...prev, ...unique];
        });
        setHasMore(data.length === 12);
        if (!reset) setPage(currentPage + 1);
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        return;
      }

      let filtered = data;
      if (underThirty) {
        filtered = data.filter(r => ((r.prep_time ?? 0) + (r.cook_time ?? 0)) <= 30);
      }
      setRecipes(prev => {
        const existing = new Set(reset ? [] : prev.map(r => r.id));
        const unique = filtered.filter(r => !existing.has(r.id));
        return reset ? filtered : [...prev, ...unique];
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [page, search, cuisine, difficulty, underThirty, loadingMore, hasMore]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchRecipes(true);
  }, [search, cuisine, difficulty, underThirty]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchRecipes(true);
  };

  // Load saved recipe IDs from API on mount
  useEffect(() => {
    apiClient.get('/social/recipes/saved')
      .then(res => {
        const ids = new Set<number>(res.data.map((r: any) => r.id));
        const counts: Record<number, number> = {};
        res.data.forEach((r: any) => { counts[r.id] = r.saves_count ?? 0; });
        setSaved(ids);
        setSaveCounts(counts);
      })
      .catch(() => {});
  }, []);

  const toggleSave = async (item: Recipe) => {
    try {
      const res = await apiClient.post(`/social/recipes/${item.id}/save`);
      setSaved(prev => {
        const next = new Set(prev);
        res.data.saved ? next.add(item.id) : next.delete(item.id);
        return next;
      });
      setSaveCounts(prev => ({ ...prev, [item.id]: res.data.saves_count }));
    } catch { /* silent */ }
  };

  const totalTime = (r: Recipe) => (r.prep_time ?? 0) + (r.cook_time ?? 0);

  const renderCard = ({ item, index }: { item: Recipe; index: number }) => {
    const isLeft = index % 2 === 0;
    const cardHeight = isLeft ? 200 : 160;

    return (
      <TouchableOpacity
        style={{
          flex: 1, margin: 6, borderRadius: 16, overflow: 'hidden',
          backgroundColor: '#fff',
          borderWidth: 1, borderColor: '#e5e7eb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        }}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.image_url || 'https://placehold.co/300x200/FE6B36/white?text=Recipe' }}
            style={{ width: '100%', height: cardHeight }}
            resizeMode="cover"
          />
          {/* Heart button */}
          <TouchableOpacity
            onPress={() => toggleSave(item)}
            style={{
              position: 'absolute', top: 8, right: 8,
              backgroundColor: 'white', borderRadius: 20, padding: 6,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1, shadowRadius: 2, elevation: 3,
            }}
          >
            <Ionicons
              name={saved.has(item.id) ? 'heart' : 'heart-outline'}
              size={16}
              color={saved.has(item.id) ? '#FE6B36' : '#9ca3af'}
            />
          </TouchableOpacity>
          {/* Time badge */}
          {totalTime(item) > 0 && (
            <View style={{
              position: 'absolute', bottom: 8, left: 8,
              backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Ionicons name="time-outline" size={11} color="white" />
              <Text style={{ color: 'white', fontSize: 11, marginLeft: 3, fontWeight: '600' }}>
                {totalTime(item)}m
              </Text>
            </View>
          )}
        </View>
        {/* Info section with top border */}
        <View style={{
          padding: 10,
          borderTopWidth: 1, borderTopColor: '#f3f4f6',
          backgroundColor: '#fff',
        }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: '#111827' }} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            {item.cuisine ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FE6B36', marginRight: 5 }} />
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>{item.cuisine}</Text>
              </View>
            ) : <View />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="heart" size={11} color="#FE6B36" />
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600' }}>
                  {saveCounts[item.id] ?? item.saves_count ?? 0}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="chatbubble-outline" size={11} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600' }}>
                  {item.comments_count ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 30, height: 30, backgroundColor: '#FE6B36', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>R</Text>
          </View>
          {/* Title */}
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>ReciLink</Text>
        </View>
        <TouchableOpacity style={{ padding: 4 }}>
          <Ionicons name="notifications-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#374151' }}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Cuisine chips */}
      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{ marginBottom: 10 }}
  contentContainerStyle={{ paddingHorizontal: 16 }}
>
  {CUISINES.map(c => (
    <TouchableOpacity
      key={c}
      onPress={() => setCuisine(c)}
      style={{
        marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: cuisine === c ? '#FE6B36' : '#f3f4f6',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: cuisine === c ? 'white' : '#374151' }}>
        {c}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

      {/* Filter row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setUnderThirty(!underThirty)}
          style={{
            flexDirection: 'row', alignItems: 'center', marginRight: 8,
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
            backgroundColor: underThirty ? '#FE6B361A' : '#f3f4f6',
            borderWidth: 1, borderColor: underThirty ? '#FE6B36' : 'transparent',
          }}
        >
          <Ionicons name="time-outline" size={14} color={underThirty ? '#FE6B36' : '#6b7280'} />
          <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '600', color: underThirty ? '#FE6B36' : '#6b7280' }}>
            Under 30m
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {DIFFICULTIES.filter(d => d !== 'All').map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => setDifficulty(difficulty === d ? 'All' : d)}
              style={{
                flexDirection: 'row', alignItems: 'center', marginRight: 8,
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                backgroundColor: difficulty === d ? '#FE6B361A' : '#f3f4f6',
                borderWidth: 1, borderColor: difficulty === d ? '#FE6B36' : 'transparent',
              }}
            >
              <Ionicons name="restaurant-outline" size={13} color={difficulty === d ? '#FE6B36' : '#6b7280'} />
              <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '600', color: difficulty === d ? '#FE6B36' : '#6b7280' }}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FE6B36" />
        </View>
      ) : (
        <FlatList
          data={recipes}
          numColumns={2}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FE6B36" />}
          onEndReached={() => !search && cuisine === 'All' && difficulty === 'All' && fetchRecipes()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#FE6B36" style={{ paddingVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Ionicons name="restaurant-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 15 }}>No recipes found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
