import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listCategories, createCategory, updateCategory, deleteCategory, Category } from '../../db/database';
import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';

export default function CategoriesSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');

  const loadCategories = async () => {
    try {
      const list = await listCategories();
      setCategories(list);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setModalVisible(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    
    try {
      if (editingId) {
        await updateCategory(editingId, name.trim());
      } else {
        await createCategory(name.trim());
      }
      setModalVisible(false);
      loadCategories();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save category. Name must be unique.');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteCategory(id);
          loadCategories();
        } catch (e) {
          Alert.alert('Error', 'Could not delete category.');
        }
      }},
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-4 border-b border-gray-800 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Categories</Text>
        <Pressable onPress={openAddModal} className="bg-primary p-2 rounded-full">
          <Ionicons name="add" size={24} color="#121212" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {categories.map((cat) => (
          <View key={cat.id} className="bg-surface p-4 rounded-xl mb-3 border border-gray-800 flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-bold text-white">{cat.name}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={() => openEditModal(cat)} className="p-2 bg-gray-700 rounded-lg">
                <Ionicons name="pencil" size={16} color="white" />
              </Pressable>
              <Pressable onPress={() => handleDelete(cat.id)} className="p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <Ionicons name="trash" size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        ))}
        {categories.length === 0 && (
            <Text className="text-textDim text-center italic mt-4">No categories defined.</Text>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface p-6 rounded-t-3xl border-t border-gray-700">
            <Text className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Category' : 'New Category'}</Text>
            
            <Text className="text-textDim text-xs mb-1 uppercase">Name</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700 mb-6"
              placeholder="e.g. Chest"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />

            <View className="flex-row gap-4">
              <Pressable 
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-gray-700 p-4 rounded-xl items-center"
              >
                <Text className="font-bold text-white">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleSave}
                className="flex-1 bg-primary p-4 rounded-xl items-center"
              >
                <Text className="font-bold text-background">Save</Text>
              </Pressable>
            </View>
            <View style={{ height: insets.bottom }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
