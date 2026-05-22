import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }: any) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-3xl font-extrabold text-gray-900 mb-4">Welcome!</Text>
      <Text className="text-gray-600 mb-10 text-center">
        You are now logged in to Recilink.
      </Text>
      
      <TouchableOpacity
        className="bg-red-500 rounded-xl px-8 py-3"
        onPress={handleLogout}
      >
        <Text className="text-white font-bold text-lg">Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
