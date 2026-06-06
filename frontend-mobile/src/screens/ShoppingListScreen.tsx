import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TextInput, TouchableOpacity, SectionList, Modal,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

type ShoppingItem = { id: string; name: string; checked: boolean; category: string };
type PantryItem   = { id: string; name: string };
type Suggestion   = { id: number; title: string; image_url: string | null; missing_ingredients: string[]; missing_count: number };

const SHOPPING_KEY = 'shopping_list';
const PANTRY_KEY   = 'pantry_items';
const DEFAULT_CATEGORIES = ['Produce', 'Dairy & Proteins', 'Pantry'];

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

const QUICK_ADD_CATEGORIES = [
  { label: 'Vegetables', emoji: '🥬', items: ['Carrot', 'Potato', 'Onion', 'Garlic', 'Tomato', 'Spinach', 'Cabbage', 'Broccoli', 'Cucumber', 'Capsicum', 'Celery', 'Mushroom', 'Corn', 'Pumpkin', 'Bean Sprouts'] },
  { label: 'Proteins',   emoji: '🥩', items: ['Chicken', 'Beef', 'Pork', 'Lamb', 'Egg', 'Tofu', 'Tempeh', 'Tuna', 'Salmon', 'Shrimp', 'Sardine', 'Lentils', 'Chickpeas', 'Black Beans'] },
  { label: 'Dairy',      emoji: '🥛', items: ['Milk', 'Butter', 'Cheese', 'Cheddar', 'Cream', 'Yoghurt', 'Sour Cream', 'Cream Cheese', 'Coconut Milk', 'Evaporated Milk'] },
  { label: 'Grains',     emoji: '🌾', items: ['Rice', 'Pasta', 'Bread', 'Flour', 'Oats', 'Noodles', 'Couscous', 'Quinoa', 'Breadcrumbs', 'Cornstarch'] },
  { label: 'Condiments', emoji: '🫙', items: ['Soy Sauce', 'Oyster Sauce', 'Fish Sauce', 'Chilli Sauce', 'Ketchup', 'Mayonnaise', 'Mustard', 'Vinegar', 'Sesame Oil', 'Honey', 'Sugar', 'Salt', 'Pepper', 'Cumin', 'Turmeric', 'Paprika'] },
];

export default function ShoppingListScreen() {
  // ── Shopping list ──────────────────────────────────────────
  const [items, setItems]             = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem]         = useState('');
  const [newCategory, setNewCategory] = useState('Produce');
  const [showCatPicker, setShowCatPicker] = useState(false);

  // ── Pantry ─────────────────────────────────────────────────
  const [pantry, setPantry]               = useState<PantryItem[]>([]);
  const [pantryExpanded, setPantryExpanded] = useState(true);

  // ── Ingredient search modal ────────────────────────────────
  const [searchModal, setSearchModal]         = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [searchResults, setSearchResults]     = useState<string[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Suggestions ────────────────────────────────────────────
  const [suggestions, setSuggestions]               = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);

  // ── Quick Add ──────────────────────────────────────────────
  const [quickAddModal, setQuickAddModal]       = useState(false);
  const [quickAddCategory, setQuickAddCategory] = useState(QUICK_ADD_CATEGORIES[0]);
  const [quickAddChecked, setQuickAddChecked]   = useState<Set<string>>(new Set());

  // ── Load on focus ──────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      Promise.all([
        AsyncStorage.getItem(SHOPPING_KEY),
        AsyncStorage.getItem(PANTRY_KEY),
      ]).then(([shopRaw, pantryRaw]) => {
        const loadedItems:  ShoppingItem[] = shopRaw   ? JSON.parse(shopRaw)   : [];
        const loadedPantry: PantryItem[]   = pantryRaw ? JSON.parse(pantryRaw) : [];
        setItems(loadedItems);
        setPantry(loadedPantry);
        fetchSuggestions(loadedPantry);
      });
    }, [])
  );

  // ── Ingredient search (debounced) ──────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiClient.get('/recommendations/ingredients/search', {
          params: { q: searchQuery.trim() },
        });
        setSearchResults(res.data.ingredients ?? []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const openSearchModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchModal(true);
    // auto-focus after modal animation
    setTimeout(() => searchInputRef.current?.focus(), 200);
  };

  const closeSearchModal = () => {
    setSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const selectIngredient = (name: string) => {
    if (pantry.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      closeSearchModal();
      return;
    }
    const updated = [...pantry, { id: Date.now().toString(), name }];
    closeSearchModal();
    savePantry(updated);
  };

  // ── Pantry helpers ─────────────────────────────────────────
  const savePantry = (updated: PantryItem[]) => {
    setPantry(updated);
    AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
    fetchSuggestions(updated);
  };

  const removeFromPantry = (id: string) => savePantry(pantry.filter(p => p.id !== id));

  const clearPantry = () =>
    Alert.alert('Clear Pantry', 'Remove all pantry ingredients?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => savePantry([]) },
    ]);

  // ── Suggestions ────────────────────────────────────────────
  const fetchSuggestions = async (currentPantry: PantryItem[]) => {
    if (currentPantry.length < 2) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    try {
      const res = await apiClient.post('/recipes/match', {
        ingredients: currentPantry.map(p => p.name),
      });
      setSuggestions(res.data);
    } catch { setSuggestions([]); }
    finally { setSuggestionsLoading(false); }
  };

  // ── Quick Add helpers ──────────────────────────────────────
  const openQuickAdd = (cat: typeof QUICK_ADD_CATEGORIES[0]) => {
    setQuickAddCategory(cat);
    setQuickAddChecked(new Set());
    setQuickAddModal(true);
  };

  const toggleQuickAddItem = (item: string) => {
    setQuickAddChecked(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const confirmQuickAdd = () => {
    const toAdd = [...quickAddChecked].filter(
      item => !pantry.some(p => p.name.toLowerCase() === item.toLowerCase())
    );
    if (toAdd.length > 0) {
      savePantry([...pantry, ...toAdd.map(name => ({ id: Date.now().toString() + name, name }))]);
    }
    setQuickAddModal(false);
  };

  // ── Shopping list helpers ──────────────────────────────────
  const saveList = (updated: ShoppingItem[]) => {
    setItems(updated);
    AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(updated));
  };

  const addToShoppingList = (ingredientName: string) => {
    if (items.some(i => i.name.toLowerCase() === ingredientName.toLowerCase())) {
      Alert.alert('Already in list', `"${ingredientName}" is already in your shopping list.`);
      return;
    }
    saveList([...items, { id: Date.now().toString(), name: ingredientName, checked: false, category: 'Produce' }]);
  };

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    saveList([...items, { id: Date.now().toString(), name, checked: false, category: newCategory }]);
    setNewItem('');
  };

  const toggleItem  = (id: string) => saveList(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const removeItem  = (id: string) => saveList(items.filter(i => i.id !== id));

  const clearCompleted = () =>
    Alert.alert('Clear completed', 'Remove all checked items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => saveList(items.filter(i => !i.checked)) },
    ]);

  const remaining = items.filter(i => !i.checked).length;
  const sections  = [...new Set(items.map(i => i.category))].map(cat => ({
    title: cat.toUpperCase(),
    data:  items.filter(i => i.category === cat),
  }));

  // ── List header (Pantry + Suggestions) ────────────────────
  const ListHeader = (
    <View>
      {/* ── My Pantry ───────────────────────────────────────── */}
      <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', overflow: 'hidden' }}>
        <TouchableOpacity
          onPress={() => setPantryExpanded(e => !e)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🥡</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>My Pantry</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                {pantry.length === 0
                  ? 'Add ingredients you have at home'
                  : `${pantry.length} ingredient${pantry.length !== 1 ? 's' : ''} at home`}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {pantry.length > 0 && (
              <TouchableOpacity onPress={clearPantry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Clear all</Text>
              </TouchableOpacity>
            )}
            <Ionicons name={pantryExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {pantryExpanded && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {/* Ingredient chips */}
            {pantry.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {pantry.map(p => (
                  <View
                    key={p.id}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingLeft: 12, paddingRight: 6, paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500', marginRight: 4 }}>{toTitleCase(p.name)}</Text>
                    <TouchableOpacity onPress={() => removeFromPantry(p.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="close-circle" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Search-to-add button */}
            <TouchableOpacity
              onPress={openSearchModal}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' }}
            >
              <Ionicons name="search-outline" size={15} color="#9ca3af" />
              <Text style={{ fontSize: 13, color: '#9ca3af', flex: 1 }}>Search ingredient to add…</Text>
              <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
            </TouchableOpacity>

            {/* Quick Add category chips */}
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 }}>QUICK ADD BY CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                {QUICK_ADD_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.label}
                    onPress={() => openQuickAdd(cat)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }}
                  >
                    <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── Almost Ready to Cook ────────────────────────────── */}
      {(suggestionsLoading || suggestions.length > 0) && (
        <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: '#fed7aa', backgroundColor: '#fff7ed', overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => setSuggestionsExpanded(e => !e)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>✨</Text>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>Almost Ready to Cook</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                  {suggestionsLoading
                    ? 'Scanning recipes…'
                    : `${suggestions.length} recipe${suggestions.length !== 1 ? 's' : ''} — just grab 1–3 more ingredients`}
                </Text>
              </View>
            </View>
            <Ionicons name={suggestionsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
          </TouchableOpacity>

          {suggestionsExpanded && (
            suggestionsLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color="#FE6B36" />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}
              >
                {suggestions.map(s => (
                  <View
                    key={s.id}
                    style={{ width: 210, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ffe4cc' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{
                        backgroundColor: s.missing_count === 1 ? '#dcfce7' : s.missing_count === 2 ? '#fef9c3' : '#fee2e2',
                        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                      }}>
                        <Text style={{
                          fontSize: 10, fontWeight: '700',
                          color: s.missing_count === 1 ? '#16a34a' : s.missing_count === 2 ? '#ca8a04' : '#dc2626',
                        }}>
                          {s.missing_count} missing
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 10 }} numberOfLines={2}>
                      {s.title}
                    </Text>

                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', marginBottom: 6, letterSpacing: 0.5 }}>
                      ADD TO YOUR LIST:
                    </Text>

                    {s.missing_ingredients.map((ing, idx) => {
                      const inList   = items.some(i => i.name.toLowerCase() === ing.toLowerCase());
                      const inPantry = pantry.some(p => p.name.toLowerCase() === ing.toLowerCase());
                      const done     = inList || inPantry;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => addToShoppingList(ing)}
                          disabled={done}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
                        >
                          <Text style={{ fontSize: 12, color: done ? '#9ca3af' : '#374151', flex: 1 }} numberOfLines={1}>{toTitleCase(ing)}</Text>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? '#d1fae5' : '#FE6B36', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
                            <Ionicons name={done ? 'checkmark' : 'add'} size={14} color="white" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            )
          )}
        </View>
      )}

      {/* ── Shopping list divider ────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', letterSpacing: 1 }}>SHOPPING LIST</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>{remaining} item{remaining !== 1 ? 's' : ''} remaining</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>

        {/* ── Header ──────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FE6B3620', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={18} color="#FE6B36" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 28, height: 28, backgroundColor: '#FE6B36', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>R</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>ReciLink</Text>
          </View>
          <TouchableOpacity style={{ padding: 4 }}>
            <Ionicons name="notifications-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── Title row ───────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', lineHeight: 32 }}>My Shopping</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827' }}>List</Text>
          </View>
          <TouchableOpacity onPress={clearCompleted}>
            <Text style={{ fontSize: 13, color: '#FE6B36', fontWeight: '600' }}>Clear completed</Text>
          </TouchableOpacity>
        </View>

        {/* ── Main list ───────────────────────────────────────── */}
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 20 }}>
              <Ionicons name="cart-outline" size={40} color="#e5e7eb" />
              <Text style={{ color: '#9ca3af', marginTop: 10, fontSize: 14 }}>Shopping list is empty</Text>
              <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>Add items below to get started</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginTop: 16, marginBottom: 6, paddingHorizontal: 16 }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => toggleItem(item.id)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2, borderColor: item.checked ? '#FE6B36' : '#d1d5db',
                backgroundColor: item.checked ? '#FE6B36' : 'transparent',
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
              }}>
                {item.checked && <Ionicons name="checkmark" size={13} color="white" />}
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: item.checked ? '#9ca3af' : '#111827', textDecorationLine: item.checked ? 'line-through' : 'none',textTransform: 'capitalize' }}>
                {item.name}
              </Text>
              <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 4 }}>
                <Ionicons name="close" size={16} color="#d1d5db" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        {/* ── Add to shopping list ────────────────────────────── */}
        <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={() => setShowCatPicker(!showCatPicker)}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
          >
            <Text style={{ fontSize: 12, color: '#9ca3af', marginRight: 4 }}>Category:</Text>
            <Text style={{ fontSize: 12, color: '#FE6B36', fontWeight: '600' }}>{newCategory}</Text>
            <Ionicons name="chevron-down" size={12} color="#FE6B36" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {showCatPicker && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {DEFAULT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => { setNewCategory(cat); setShowCatPicker(false); }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: newCategory === cat ? '#FE6B36' : '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: newCategory === cat ? 'white' : '#374151' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={addItem}
              placeholder="Add to shopping list…"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', marginRight: 10 }}
            />
            <TouchableOpacity
              onPress={addItem}
              style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>

      {/* ── Quick Add Modal ──────────────────────────────────── */}
      <Modal
        visible={quickAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setQuickAddModal(false)}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{quickAddCategory.emoji} {quickAddCategory.label}</Text>
            <TouchableOpacity onPress={() => setQuickAddModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <Text style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, fontSize: 13, color: '#9ca3af' }}>
            Tick what you already have at home
          </Text>

          {/* Category tab row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
            {QUICK_ADD_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                onPress={() => { setQuickAddCategory(cat); setQuickAddChecked(new Set()); }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: quickAddCategory.label === cat.label ? '#FE6B36' : '#f3f4f6' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: quickAddCategory.label === cat.label ? '#fff' : '#374151' }}>{cat.emoji} {cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ingredient checklist */}
          <FlatList
            data={quickAddCategory.items}
            keyExtractor={item => item}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
            renderItem={({ item }) => {
              const inPantry  = pantry.some(p => p.name.toLowerCase() === item.toLowerCase());
              const isChecked = quickAddChecked.has(item);
              return (
                <TouchableOpacity
                  onPress={() => !inPantry && toggleQuickAddItem(item)}
                  disabled={inPantry}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, justifyContent: 'space-between' }}
                >
                  <Text style={{ fontSize: 15, color: inPantry ? '#9ca3af' : '#111827', fontWeight: '500' }}>{item}</Text>
                  {inPantry ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>In pantry</Text>
                    </View>
                  ) : (
                    <View style={{
                      width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                      borderColor: isChecked ? '#FE6B36' : '#d1d5db',
                      backgroundColor: isChecked ? '#FE6B36' : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isChecked && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Add button */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
            <TouchableOpacity
              onPress={confirmQuickAdd}
              disabled={quickAddChecked.size === 0}
              style={{ backgroundColor: quickAddChecked.size === 0 ? '#e5e7eb' : '#FE6B36', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: quickAddChecked.size === 0 ? '#9ca3af' : '#fff' }}>
                {quickAddChecked.size === 0 ? 'Select ingredients' : `Add ${quickAddChecked.size} to Pantry`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Ingredient Search Modal ──────────────────────────── */}
      <Modal
        visible={searchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSearchModal}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Modal header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', margin:10}}>Add to Pantry</Text>
            <TouchableOpacity onPress={closeSearchModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Type an ingredient name…"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 15, color: '#111827' }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          {searchLoading ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color="#FE6B36" size="large" />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Searching ingredients…</Text>
            </View>
          ) : searchQuery.trim().length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🥦</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Search your ingredients</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 }}>
                Type an ingredient name to find it from our database
              </Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 }}>No matches found</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 }}>
                Try a different name — only ingredients in our recipe database can be added
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
              renderItem={({ item }) => {
                const alreadyAdded = pantry.some(p => p.name.toLowerCase() === item.toLowerCase());
                return (
                  <TouchableOpacity
                    onPress={() => selectIngredient(item)}
                    disabled={alreadyAdded}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="leaf-outline" size={16} color="#6b7280" />
                      </View>
                      <Text style={{ fontSize: 15, color: alreadyAdded ? '#9ca3af' : '#111827', fontWeight: '500', textTransform: 'capitalize' }}>
                        {item}
                      </Text>
                    </View>
                    {alreadyAdded ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>In pantry</Text>
                      </View>
                    ) : (
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FE6B36', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="add" size={18} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
