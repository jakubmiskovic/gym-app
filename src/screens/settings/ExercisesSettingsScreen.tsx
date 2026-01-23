import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Exercise, listExercises, createExercise, updateExercise, deleteExercise, listCategories, Category } from '../../db/database';
import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';

export default function ExercisesSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  const loadData = async () => {
    try {
      const eList = await listExercises();
      const cList = await listCategories();
      setExercises(eList);
      setCategories(cList);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCategory(categories.length > 0 ? categories[0].name : '');
    setModalVisible(true);
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setName(exercise.name);
    setCategory(exercise.category || (categories.length > 0 ? categories[0].name : ''));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    
    try {
      if (editingId) {
        await updateExercise(editingId, name.trim(), category.trim() || undefined);
      } else {
        await createExercise(name.trim(), category.trim() || undefined);
      }
      setModalVisible(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save exercise');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteExercise(id);
          loadData();
        } catch (e) {
          Alert.alert('Error', 'Could not delete exercise. It might be used in a routine.');
        }
      }},
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-4 border-b border-gray-800 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Exercises</Text>
        <Pressable onPress={openAddModal} className="bg-primary p-2 rounded-full">
          <Ionicons name="add" size={24} color="#121212" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {exercises.map((ex) => (
          <View key={ex.id} className="bg-surface p-4 rounded-xl mb-3 border border-gray-800 flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-bold text-white">{ex.name}</Text>
              <Text className="text-xs text-textDim uppercase mt-1">{ex.category || 'Uncategorized'}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={() => openEditModal(ex)} className="p-2 bg-gray-700 rounded-lg">
                <Ionicons name="pencil" size={16} color="white" />
              </Pressable>
              <Pressable onPress={() => handleDelete(ex.id)} className="p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <Ionicons name="trash" size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface p-6 rounded-t-3xl border-t border-gray-700">
            <Text className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Exercise' : 'New Exercise'}</Text>
            
            <Text className="text-textDim text-xs mb-1 uppercase">Name</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700 mb-4"
              placeholder="e.g. Bench Press"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />

            <Text className="text-textDim text-xs mb-1 uppercase">Category</Text>
            <View className="h-40 mb-6 border border-gray-700 rounded-lg bg-background">
              <ScrollView>
                 {categories.map((cat) => (
                   <Pressable
                     key={cat.id}
                     onPress={() => setCategory(cat.name)}
                     className={clsx(
                       "p-3 border-b border-gray-800",
                       category === cat.name ? "bg-primary/20" : "bg-transparent"
                     )}
                   >
                      <Text className={clsx(
                        "font-medium",
                        category === cat.name ? "text-primary" : "text-text"
                      )}>{cat.name}</Text>
                   </Pressable>
                 ))}
                 {categories.length === 0 && (
                   <Text className="p-4 text-textDim italic text-center">No categories found. Create one in 'Categories' settings.</Text>
                 )}
              </ScrollView>
            </View>

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
