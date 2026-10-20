import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

type ProfileData = {
  id: number; username: string; bio: string | null; avatar_url: string | null;
  recipes_count: number; followers_count: number; following_count: number;
  is_following: boolean;
};
type Recipe = {
  id: number; title: string; image_url: string | null;
  cuisine: string | null; prep_time: number | null; cook_time: number | null;
  saves_count: number; comments_count: number;
};

export default function PublicProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [loading, setLoading]   = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  // Redirect to own profile if user navigates to their own page
  useEffect(() => {
    AsyncStorage.getItem('user').then(raw => {
      if (raw) {
        const me = JSON.parse(raw);
        if (me.id === userId) navigation.getParent()?.navigate('Profile');
      }
    });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        apiClient.get(`/social/users/${userId}/profile`),
        apiClient.get(`/social/users/${userId}/recipes`),
      ]).then(([profileRes, recipesRes]) => {
        setProfile(profileRes.data);
        setRecipes(recipesRes.data);
      }).catch(() => {
        Alert.alert('Error', 'Could not load profile.');
        navigation.goBack();
      }).finally(() => setLoading(false));
    }, [userId])
  );

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (profile.is_following) {
        await apiClient.delete(`/social/users/${userId}/follow`);
        setProfile({ ...profile, is_following: false, followers_count: profile.followers_count - 1 });
      } else {
        await apiClient.post(`/social/users/${userId}/follow`);
        setProfile({ ...profile, is_following: true, followers_count: profile.followers_count + 1 });
      }
    } catch { /* silent */ }
    finally { setFollowLoading(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FE6B36" />
      </View>
    );
  }

  if (!profile) return null;

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
      style={{ width: '47%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', elevation: 1, borderWidth: 1, borderColor: '#f3f4f6', margin: '1.5%' }}
    >
      <Image
        source={{ uri: item.image_url || 'https://placehold.co/300x200/FE6B36/white?text=Recipe' }}
        style={{ width: '100%', height: 110 }}
        resizeMode="cover"
      />
      <View style={{ padding: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }} numberOfLines={2}>{item.title}</Text>
        <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
          {(item.prep_time ?? 0) + (item.cook_time ?? 0)} min {item.cuisine ? `• ${item.cuisine}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="heart" size={10} color="#FE6B36" />
            <Text style={{ fontSize: 10, color: '#9ca3af' }}>{item.saves_count}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="chatbubble-outline" size={10} color="#9ca3af" />
            <Text style={{ fontSize: 10, color: '#9ca3af' }}>{item.comments_count}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 }}>{profile.username}</Text>
      </View>

      <FlatList
        data={recipes}
        numColumns={2}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRecipe}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 }}>
            {/* Avatar */}
            <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 34 }}>
                {profile.username[0].toUpperCase()}
              </Text>
            </View>

            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 }}>{profile.username}</Text>

            {profile.bio ? (
              <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16, paddingHorizontal: 10 }}>
                {profile.bio}
              </Text>
            ) : (
              <View style={{ marginBottom: 16 }} />
            )}

            {/* Stats */}
            <View style={{ flexDirection: 'row', backgroundColor: '#fff7ed', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginBottom: 16, borderWidth: 1, borderColor: '#fed7aa', gap: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{profile.recipes_count}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>RECIPES</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#fed7aa' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{profile.followers_count}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>FOLLOWERS</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#fed7aa' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FE6B36' }}>{profile.following_count}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>FOLLOWING</Text>
              </View>
            </View>

            {/* Follow button */}
            <TouchableOpacity
              onPress={handleFollow}
              disabled={followLoading}
              style={{
                width: '100%', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
                backgroundColor: profile.is_following ? '#f3f4f6' : '#FE6B36',
                borderWidth: profile.is_following ? 1 : 0, borderColor: '#e5e7eb',
                opacity: followLoading ? 0.6 : 1, marginBottom: 8,
              }}
            >
              <Text style={{ color: profile.is_following ? '#374151' : 'white', fontWeight: '700', fontSize: 14 }}>
                {profile.is_following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            {/* Recipes divider */}
            {recipes.length > 0 && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, alignSelf: 'flex-start', marginTop: 8, marginBottom: 4 }}>
                RECIPES
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 20 }}>
            <Ionicons name="restaurant-outline" size={40} color="#e5e7eb" />
            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>No recipes posted yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
