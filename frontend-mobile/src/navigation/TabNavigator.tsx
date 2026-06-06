import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import CommunityScreen from '../screens/CommunityScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import SimilarRecipesScreen from '../screens/SimilarRecipesScreen';
import PostScreen from '../screens/PostScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditRecipeScreen from '../screens/EditRecipeScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <HomeStack.Screen name="SimilarRecipes" component={SimilarRecipesScreen} />
      <HomeStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </HomeStack.Navigator>
  );
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 72;

function CommunityStackScreen() {
  return (
    <CommunityStack.Navigator screenOptions={{ headerShown: false }}>
      <CommunityStack.Screen name="CommunityFeed" component={CommunityScreen} />
      <CommunityStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <CommunityStack.Screen name="SimilarRecipes" component={SimilarRecipesScreen} />
      <CommunityStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </CommunityStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditRecipe" component={EditRecipeScreen} />
      <ProfileStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <ProfileStack.Screen name="SimilarRecipes" component={SimilarRecipesScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FE6B36',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, { active: any; inactive: any }> = {
            Home:      { active: 'home',         inactive: 'home-outline' },
            Community: { active: 'people',       inactive: 'people-outline' },
            Post:      { active: 'add-circle',   inactive: 'add-circle-outline' },
            Match:     { active: 'sparkles',     inactive: 'sparkles-outline' },
            Profile:   { active: 'person',       inactive: 'person-outline' },
          };
          const icon = icons[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeStackScreen} />
      <Tab.Screen name="Community" component={CommunityStackScreen} />
      <Tab.Screen name="Post"      component={PostScreen} />
      <Tab.Screen name="Match"     component={ShoppingListScreen} />
      <Tab.Screen name="Profile"   component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}
