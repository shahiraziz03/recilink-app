import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import apiClient from '../api/apiClient';

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

export default function LoginScreen({ navigation }: any) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        identifier,
        password,
      });

      const token = response.data.access_token;
      await AsyncStorage.setItem('token', token);
      
      Alert.alert('Success', 'Logged in successfully!');
      navigation.replace('Home');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'An error occurred';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fff8f6] justify-center px-6">
      <View className="items-center mb-10">
        <View className="w-16 h-16 bg-[#FE6B36] rounded-2xl flex items-center justify-center mb-4 shadow-sm transform rotate-3">
          <Text className="text-white font-extrabold text-3xl transform -rotate-3">R</Text>
        </View>
        <Text className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</Text>
        <Text className="text-gray-500">Sign in to your Recilink account</Text>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Username or Email</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 focus:border-[#FE6B36]"
          placeholder="Enter username or email"
          autoCapitalize="none"
          value={identifier}
          onChangeText={setIdentifier}
        />
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-1.5">
          <Text className="text-sm font-semibold text-gray-700">Password</Text>
          <TouchableOpacity>
            <Text className="text-sm font-medium text-[#FE6B36]">Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <View className="relative flex-row items-center bg-white border border-gray-200 rounded-xl px-4 focus:border-[#FE6B36]">
          <TextInput
            className="flex-1 py-3.5 text-base text-gray-800"
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        className="bg-[#FE6B36] rounded-xl py-4 items-center mb-6 shadow-sm"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white font-bold text-lg">{loading ? 'Logging in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-[1px] bg-gray-200" />
        <Text className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Or continue with</Text>
        <View className="flex-1 h-[1px] bg-gray-200" />
      </View>

      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-xl py-3.5 flex-row justify-center items-center mb-6 shadow-sm"
        onPress={() => Alert.alert('Coming Soon', 'Google Sign-In will be available soon!')}
      >
        <GoogleIcon />
        <Text className="ml-3 text-gray-700 font-bold text-base">Sign in with Google</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-2">
        <Text className="text-gray-600">Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text className="text-[#FE6B36] font-bold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}