import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/apiClient';

const CUISINES = ['Malaysian', 'Italian', 'Thai', 'Asian', 'General', 'Western', 'Japanese', 'Chinese', 'Indian'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

type DropdownProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
};

function Dropdown({ label, value, options, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontSize: 14, color: value ? '#111827' : '#9ca3af' }}>{value || label}</Text>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', paddingHorizontal: 32 }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => { onSelect(opt); setOpen(false); }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
              >
                <Text style={{ fontSize: 15, color: opt === value ? '#FE6B36' : '#374151', fontWeight: opt === value ? '700' : '400' }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function PostScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['', '']);
  const [steps, setSteps] = useState<string[]>(['']);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to add a cover photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const addIngredient = () => setIngredients(prev => [...prev, '']);
  const updateIngredient = (i: number, val: string) => setIngredients(prev => prev.map((x, idx) => idx === i ? val : x));
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const addStep = () => setSteps(prev => [...prev, '']);
  const updateStep = (i: number, val: string) => setSteps(prev => prev.map((x, idx) => idx === i ? val : x));
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i));

  const handleTagInput = (text: string) => {
    if (text.endsWith(' ') || text.endsWith(',')) {
      const tag = text.replace(/[, ]+$/, '').trim();
      if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag]);
      setTagInput('');
    } else {
      setTagInput(text);
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handlePost = async () => {
    if (!title.trim()) { Alert.alert('Missing field', 'Please enter a recipe name.'); return; }
    const cleanIngredients = ingredients.filter(i => i.trim());
    const cleanSteps = steps.filter(s => s.trim());
    if (cleanIngredients.length === 0) { Alert.alert('Missing field', 'Add at least one ingredient.'); return; }
    if (cleanSteps.length === 0) { Alert.alert('Missing field', 'Add at least one step.'); return; }

    setLoading(true);
    try {
      // Step 1 — create the recipe record
      const recipeRes = await apiClient.post('/recipes', {
        title: title.trim(),
        description: description.trim() || null,
        cuisine: cuisine || null,
        difficulty: difficulty || null,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        servings: servings ? parseInt(servings) : 4,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        tags,
        image_url: imageUri || null,
      });

      // Step 2 — create the community post linked to that recipe
      await apiClient.post('/posts', {
        recipe_id: recipeRes.data.id,
        caption: caption.trim() || null,
        cover_photo_url: imageUri || null,
      });

      setImageUri(null);
      setTitle('');
      setCaption('');
      setDescription('');
      setCuisine('');
      setDifficulty('');
      setPrepTime('');
      setCookTime('');
      setServings('');
      setIngredients(['', '']);
      setSteps(['']);
      setTagInput('');
      setTags([]);
      Alert.alert('Posted!', 'Your recipe has been shared with the community.', [
        { text: 'OK', onPress: () => navigation.navigate('Community') }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to post recipe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#FE6B36' }}>ReciLink</Text>
          </View>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FE6B3620', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={18} color="#FE6B36" />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Title */}
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Share Your Recipe</Text>
          <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Inspire the community with your culinary creations.</Text>

          {/* Cover photo */}
          <TouchableOpacity onPress={pickImage} style={{
            borderWidth: 1.5, borderColor: '#FE6B3660', borderStyle: 'dashed',
            borderRadius: 14, backgroundColor: '#FFF8F6', height: 160,
            alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            overflow: 'hidden',
          }}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#FE6B36" />
                <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: '#374151' }}>Add a cover photo</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>JPEG, PNG up to 10MB</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Recipe Name */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Recipe Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Grandma's Secret Pasta Carbonara"
            placeholderTextColor="#9ca3af"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 16 }}
          />

          {/* Caption */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Caption</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Short tagline shown under the title in the community feed</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="e.g. The creamiest carbonara you'll ever make 🍝"
            placeholderTextColor="#9ca3af"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 16 }}
          />

          {/* Description */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Description</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Longer story or background shown in the recipe detail page</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us about this dish — where it's from, why you love it, any tips..."
            placeholderTextColor="#9ca3af"
            multiline
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 16, minHeight: 80 }}
          />

          {/* Cuisine + Difficulty */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Cuisine</Text>
              <Dropdown label="Select" value={cuisine} options={CUISINES} onSelect={setCuisine} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Difficulty</Text>
              <Dropdown label="Select" value={difficulty} options={DIFFICULTIES} onSelect={setDifficulty} />
            </View>
          </View>

          {/* Prep + Cook Time + Servings */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Prep (min)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12 }}>
                <Ionicons name="time-outline" size={15} color="#9ca3af" style={{ marginRight: 5 }} />
                <TextInput value={prepTime} onChangeText={setPrepTime} placeholder="15" placeholderTextColor="#9ca3af" keyboardType="number-pad" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Cook (min)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12 }}>
                <Ionicons name="flame-outline" size={15} color="#9ca3af" style={{ marginRight: 5 }} />
                <TextInput value={cookTime} onChangeText={setCookTime} placeholder="30" placeholderTextColor="#9ca3af" keyboardType="number-pad" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Servings</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12 }}>
                <Ionicons name="people-outline" size={15} color="#9ca3af" style={{ marginRight: 5 }} />
                <TextInput value={servings} onChangeText={setServings} placeholder="4" placeholderTextColor="#9ca3af" keyboardType="number-pad" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Ingredients</Text>
            <TouchableOpacity onPress={addIngredient} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add" size={16} color="#FE6B36" />
              <Text style={{ fontSize: 13, color: '#FE6B36', fontWeight: '600', marginLeft: 2 }}>Add Ingredient</Text>
            </TouchableOpacity>
          </View>
          {ingredients.map((ing, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                value={ing}
                onChangeText={val => updateIngredient(i, val)}
                placeholder={`e.g. 200g All-purpose flour`}
                placeholderTextColor="#9ca3af"
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' }}
              />
              <TouchableOpacity onPress={() => removeIngredient(i)} style={{ marginLeft: 8, padding: 4 }}>
                <Ionicons name="trash-outline" size={18} color="#d1d5db" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Steps */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Preparation Steps</Text>
            <TouchableOpacity onPress={addStep} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add" size={16} color="#FE6B36" />
              <Text style={{ fontSize: 13, color: '#FE6B36', fontWeight: '600', marginLeft: 2 }}>Add Step</Text>
            </TouchableOpacity>
          </View>
          {steps.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 10 }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </View>
              <TextInput
                value={step}
                onChangeText={val => updateStep(i, val)}
                placeholder="Start by preheating your oven to 180°C..."
                placeholderTextColor="#9ca3af"
                multiline
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', minHeight: 44 }}
              />
              <TouchableOpacity onPress={() => removeStep(i)} style={{ marginLeft: 8, padding: 4, marginTop: 10 }}>
                <Ionicons name="remove-circle-outline" size={20} color="#d1d5db" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Tags */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 10 }}>Tags</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {tags.map(tag => (
              <TouchableOpacity key={tag} onPress={() => removeTag(tag)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0EB', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 12, color: '#FE6B36', fontWeight: '600' }}>#{tag}</Text>
                <Ionicons name="close" size={12} color="#FE6B36" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={tagInput}
            onChangeText={handleTagInput}
            placeholder="Add tags (press space or comma)..."
            placeholderTextColor="#9ca3af"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 24 }}
          />

          {/* Post button */}
          <TouchableOpacity
            onPress={handlePost}
            disabled={loading}
            style={{ backgroundColor: '#FE6B36', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="restaurant-outline" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Post Recipe</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
