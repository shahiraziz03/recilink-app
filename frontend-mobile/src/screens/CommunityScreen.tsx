import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Image, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

type PostRecipe = {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  difficulty: string | null;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  contributor_id: number | null;
  contributor_username: string | null;
  saves_count: number;
  comments_count: number;
};

type CommunityPost = {
  id: number;
  caption: string | null;
  cover_photo_url: string | null;
  created_at: string;
  recipe: PostRecipe;
  posted_by: { id: number; username: string };
};

type DatasetRecipe = {
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
  created_at: string;
};

type FeedItem =
  | { type: 'community_post'; post: CommunityPost; key: string }
  | { type: 'section_header'; title: string; key: string }
  | { type: 'dataset_row'; left: DatasetRecipe; right?: DatasetRecipe; key: string }
  | { type: 'no_community'; key: string };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CommunityScreen({ navigation }: any) {
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [datasetRecipes, setDatasetRecipes] = useState<DatasetRecipe[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [datasetLoading, setDatasetLoading]     = useState(true);
  const [datasetLoadingMore, setDatasetLoadingMore] = useState(false);
  const [search, setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved]       = useState<Set<number>>(new Set());

  const datasetPageRef = useRef(1);
  const datasetHasMoreRef = useRef(true);
  const datasetLoadingMoreRef = useRef(false);

  useEffect(() => {
    loadSaved();
    loadCommunity();
    loadDataset(true);
  }, []);

  const loadSaved = async () => {
    try {
      const res = await apiClient.get('/social/recipes/saved');
      setSaved(new Set(res.data.map((r: any) => r.id)));
    } catch { /* silent */ }
  };

  const loadCommunity = async () => {
    setCommunityLoading(true);
    try {
      const res = await apiClient.get('/posts');
      setCommunityPosts(res.data);
    } catch { /* silent */ }
    finally { setCommunityLoading(false); }
  };

  const loadDataset = useCallback(async (reset = false) => {
    if (!reset && (datasetLoadingMoreRef.current || !datasetHasMoreRef.current)) return;
    const currentPage = reset ? 1 : datasetPageRef.current;
    reset ? setDatasetLoading(true) : setDatasetLoadingMore(true);
    datasetLoadingMoreRef.current = true;

    try {
      const res = await apiClient.get('/recipes', { params: { page: currentPage, limit: 14, dataset_only: true } });
      const data: DatasetRecipe[] = res.data;
      const more = data.length === 14;
      datasetHasMoreRef.current = more;
      if (!reset) datasetPageRef.current = currentPage + 1;
      setDatasetRecipes(prev => {
        const existing = new Set(reset ? [] : prev.map(r => r.id));
        const unique = data.filter(r => !existing.has(r.id));
        return reset ? data : [...prev, ...unique];
      });
    } catch { /* silent */ }
    finally {
      setDatasetLoading(false);
      setDatasetLoadingMore(false);
      setRefreshing(false);
      datasetLoadingMoreRef.current = false;
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    datasetPageRef.current = 1;
    datasetHasMoreRef.current = true;
    loadCommunity();
    loadDataset(true);
  };

  const toggleSave = async (recipeId: number) => {
    try {
      const res = await apiClient.post(`/social/recipes/${recipeId}/save`);
      const { saved: isSaved, saves_count } = res.data;
      setSaved(prev => {
        const next = new Set(prev);
        isSaved ? next.add(recipeId) : next.delete(recipeId);
        return next;
      });
      setCommunityPosts(prev => prev.map(p =>
        p.recipe.id === recipeId
          ? { ...p, recipe: { ...p.recipe, saves_count } }
          : p
      ));
    } catch { /* silent */ }
  };

  const filteredCommunity = useMemo(() => {
    if (!search) return communityPosts;
    const q = search.toLowerCase();
    return communityPosts.filter(p => p.recipe.title.toLowerCase().includes(q));
  }, [communityPosts, search]);

  const filteredDataset = useMemo(() => {
    if (!search) return datasetRecipes;
    const q = search.toLowerCase();
    return datasetRecipes.filter(r => r.title.toLowerCase().includes(q));
  }, [datasetRecipes, search]);

  const feedData: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    if (filteredCommunity.length === 0 && !communityLoading) {
      items.push({ type: 'no_community', key: 'no_community' });
    } else {
      filteredCommunity.forEach(p =>
        items.push({ type: 'community_post', post: p, key: `cp_${p.id}` })
      );
    }

    // if (filteredDataset.length > 0) {
    //   items.push({ type: 'section_header', title: 'From Our Collection', key: 'dataset_header' });
    //   for (let i = 0; i < filteredDataset.length; i += 2) {
    //     items.push({
    //       type: 'dataset_row',
    //       left: filteredDataset[i],
    //       right: filteredDataset[i + 1],
    //       key: `dr_${filteredDataset[i].id}`,
    //     });
    //   }
    // }

    return items;
  }, [filteredCommunity, filteredDataset, communityLoading]);

  const renderCommunityPost = (post: CommunityPost) => {
    const { recipe, posted_by, caption, created_at } = post;
    const isSaved = saved.has(recipe.id);
    return (
      <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }}>
        {/* Author row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
          <TouchableOpacity
            onPress={() => recipe.contributor_id && navigation.navigate('PublicProfile', { userId: recipe.contributor_id })}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FE6B3620', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#FE6B36', fontWeight: '800', fontSize: 16 }}>
              {(posted_by.username?.[0] ?? 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: '#111827' }}>{posted_by.username}</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(created_at)}</Text>
          </View>
          {recipe.cuisine ? (
            <View style={{ backgroundColor: '#FFF0EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: '#FE6B36', fontWeight: '600' }}>{recipe.cuisine}</Text>
            </View>
          ) : null}
        </View>

        {/* Image */}
        <TouchableOpacity onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })} activeOpacity={0.95}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: recipe.image_url || 'https://placehold.co/600x400/FE6B36/white?text=Recipe' }}
              style={{ width: '100%', height: 240 }}
              resizeMode="cover"
            />
            <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: '#FE6B36', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>COMMUNITY</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={{ padding: 14 }}>
          <TouchableOpacity onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: caption ? 4 : 6 }} numberOfLines={2}>
              {recipe.title}
            </Text>
          </TouchableOpacity>

          {/* Caption */}
          {caption ? (
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 18 }} numberOfLines={2}>
              {caption}
            </Text>
          ) : null}

          {((recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="time-outline" size={13} color="#9ca3af" />
              <Text style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
                {(recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)} min
              </Text>
              {recipe.difficulty ? (
                <>
                  <Text style={{ color: '#e5e7eb', marginHorizontal: 6 }}>•</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{recipe.difficulty}</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Action row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={() => toggleSave(recipe.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={isSaved ? '#FE6B36' : '#6b7280'} />
                <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>{recipe.saves_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <Ionicons name="chatbubble-outline" size={19} color="#6b7280" />
                <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>{recipe.comments_count}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
              style={{ backgroundColor: '#FE6B36', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>View Recipe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // const renderDatasetCard = (recipe: DatasetRecipe, isLeft: boolean) => (
  //   <TouchableOpacity
  //     style={{ flex: 1, margin: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', elevation: 2 }}
  //     onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
  //     activeOpacity={0.9}
  //   >
  //     <View style={{ position: 'relative' }}>
  //       <Image
  //         source={{ uri: recipe.image_url || 'https://placehold.co/300x200/FE6B36/white?text=Recipe' }}
  //         style={{ width: '100%', height: isLeft ? 130 : 110 }}
  //         resizeMode="cover"
  //       />
  //       {/* Community badge for any user-posted recipe that slips into dataset results */}
  //       {recipe.contributor_id ? (
  //         <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#FE6B36', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
  //           <Text style={{ color: 'white', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>COMMUNITY</Text>
  //         </View>
  //       ) : null}
  //     </View>
  //     <View style={{ padding: 8 }}>
  //       <Text style={{ fontWeight: '700', fontSize: 12, color: '#111827' }} numberOfLines={2}>{recipe.title}</Text>
  //       <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
  //         {(recipe.prep_time ?? 0) + (recipe.cook_time ?? 0) > 0
  //           ? `${(recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)} min`
  //           : recipe.cuisine ?? 'Recipe'}
  //       </Text>
  //     </View>
  //   </TouchableOpacity>
  // );

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'community_post':
        return renderCommunityPost(item.post);
      case 'no_community':
        return (
          <View style={{ marginHorizontal: 16, marginBottom: 20, padding: 24, borderRadius: 20, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🍳</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>No community recipes yet</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Be the first to share your recipe!</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Post')}
              style={{ marginTop: 14, backgroundColor: '#FE6B36', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Share a Recipe</Text>
            </TouchableOpacity>
          </View>
        );
      case 'section_header':
        return (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#f3f4f6' }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 1 }}>
              {item.title.toUpperCase()}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#f3f4f6' }} />
          </View>
        );
      // case 'dataset_row':
      //   return (
      //     <View style={{ flexDirection: 'row', paddingHorizontal: 10 }}>
      //       {renderDatasetCard(item.left, true)}
      //       {item.right ? renderDatasetCard(item.right, false) : <View style={{ flex: 1, margin: 6 }} />}
      //     </View>
      //   );
      default:
        return null;
    }
  };

  const listHeader = useCallback(() => (
    <View>
      {communityLoading && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color="#FE6B36" />
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>Loading community posts...</Text>
        </View>
      )}
    </View>
  ), [communityLoading]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fafafa' }}>
      {/* ── Header + Search bar — OUTSIDE FlatList so keyboard never dismisses ── */}
      <View style={{ backgroundColor: '#fafafa', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Community</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Recipes shared by home chefs</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Post')}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FE6B36', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 6 }}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#374151' }}
            placeholder="Search community recipes..."
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

      {/* ── Feed — no TextInput inside ── */}
      <FlatList
        data={feedData}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FE6B36" />}
        onEndReached={() => !search && loadDataset()}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListFooterComponent={
          datasetLoading && !communityLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#FE6B36" />
            </View>
          ) : datasetLoadingMore ? (
            <ActivityIndicator color="#FE6B36" style={{ paddingVertical: 16 }} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
