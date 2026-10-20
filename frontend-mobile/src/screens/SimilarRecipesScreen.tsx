import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';

type SimilarRecipe = {
  id: number;
  title: string;
  cuisine: string | null;
  difficulty: string | null;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  saves_count: number;
  comments_count: number;
  jaccard_score: number;
  shared_ingredients: number;
};

export default function SimilarRecipesScreen({ route, navigation }: any) {
  const { recipeId, recipeTitle } = route.params;
  const [recipes, setRecipes] = useState<SimilarRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { load(); }, [recipeId]);

  const load = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get(`/recommendations/recipes/${recipeId}/similar`, {
        params: { limit: 12 },
      });
      setRecipes(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalTime = (r: SimilarRecipe) => (r.prep_time ?? 0) + (r.cook_time ?? 0);

  const renderCard = ({ item, index }: { item: SimilarRecipe; index: number }) => {
    const cardHeight = index % 2 === 0 ? 195 : 160;
    const pct = Math.round(item.jaccard_score * 100);
    return (
      <TouchableOpacity
        style={{
          flex: 1, margin: 6, borderRadius: 16, overflow: 'hidden',
          backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        }}
        onPress={() => navigation.push('RecipeDetail', { recipeId: item.id })}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.image_url || 'https://placehold.co/300x200/FE6B36/white?text=Recipe' }}
            style={{ width: '100%', height: cardHeight }}
            resizeMode="cover"
          />
          {/* Similarity badge */}
          <View style={{
            position: 'absolute', top: 7, left: 7,
            backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8,
            paddingHorizontal: 7, paddingVertical: 3,
            flexDirection: 'row', alignItems: 'center', gap: 3,
          }}>
            <Ionicons name="sparkles" size={9} color="#fcd34d" />
            <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>
              {pct}% match
            </Text>
          </View>
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
        <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: '#111827' }} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            {item.cuisine ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FE6B36', marginRight: 4 }} />
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>{item.cuisine}</Text>
              </View>
            ) : <View />}
            <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>
              {item.shared_ingredients} shared
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.5 }}>SIMILAR TO</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }} numberOfLines={1}>
            {recipeTitle}
          </Text>
        </View>
        <View style={{ backgroundColor: '#FFF0EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="sparkles" size={13} color="#FE6B36" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FE6B36' }}>Neo4j</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FE6B36" />
          <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Analysing ingredient graph...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14, textAlign: 'center' }}>
            Could not load similar recipes. Make sure the server is running.
          </Text>
          <TouchableOpacity
            onPress={() => load()}
            style={{ marginTop: 16, backgroundColor: '#FE6B36', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recipes}
          numColumns={2}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FE6B36" />}
          ListHeaderComponent={
            recipes.length > 0 ? (
              <View style={{ paddingHorizontal: 6, paddingVertical: 12 }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  Found <Text style={{ fontWeight: '700', color: '#111827' }}>{recipes.length}</Text> recipes with similar ingredients
                </Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  Ranked by Jaccard similarity · powered by ingredient graph
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Ionicons name="restaurant-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#374151', fontWeight: '700', marginTop: 12, fontSize: 15 }}>No similar recipes found</Text>
              <Text style={{ color: '#9ca3af', marginTop: 6, fontSize: 13, textAlign: 'center' }}>
                This recipe's ingredients don't have enough overlap with others in the graph yet.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
