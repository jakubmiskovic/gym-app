import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Routine, listRoutines, createRoutine, updateRoutine, deleteRoutine, Exercise, listExercises, getRoutineExercises } from '../../db/database';
import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';

export default function RoutinesSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);

  const loadData = async () => {
    try {
      const [rList, eList] = await Promise.all([listRoutines(), listExercises()]);
      setRoutines(rList);
      setExercises(eList);
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
    setSelectedExerciseIds([]);
    setModalVisible(true);
  };

  const openEditModal = async (routine: Routine) => {
    setEditingId(routine.id);
    setName(routine.name);
    try {
      const routineExercises = await getRoutineExercises(routine.id);
      setSelectedExerciseIds(routineExercises.map(e => e.def_id || e.id)); // Note: db returns joined object, ensure we get correct ID
      // Actually getRoutineExercises returns Exercise & ... 
      // check database.ts: SELECT RoutineExercise.id as routineExerciseId, Exercise.* ...
      // So e.id is the exercise id.
      setSelectedExerciseIds(routineExercises.map(e => e.id));
    } catch (e) {
      setSelectedExerciseIds([]);
    }
    setModalVisible(true);
  };

  const toggleExerciseSelection = (id: number) => {
    setSelectedExerciseIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    if (selectedExerciseIds.length === 0) {
      Alert.alert('Validation', 'Select at least one exercise');
      return;
    }
    
    try {
      if (editingId) {
        await updateRoutine(editingId, name.trim(), selectedExerciseIds);
      } else {
        await createRoutine(name.trim(), selectedExerciseIds);
      }
      setModalVisible(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save routine');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteRoutine(id);
          loadData();
        } catch (e) {
          Alert.alert('Error', 'Could not delete routine.');
        }
      }},
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-4 border-b border-gray-800 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Routines</Text>
        <Pressable onPress={openAddModal} className="bg-primary p-2 rounded-full">
          <Ionicons name="add" size={24} color="#121212" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {routines.map((routine) => (
          <View key={routine.id} className="bg-surface p-4 rounded-xl mb-3 border border-gray-800 flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-bold text-white">{routine.name}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={() => openEditModal(routine)} className="p-2 bg-gray-700 rounded-lg">
                <Ionicons name="pencil" size={16} color="white" />
              </Pressable>
              <Pressable onPress={() => handleDelete(routine.id)} className="p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <Ionicons name="trash" size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface p-6 rounded-t-3xl border-t border-gray-700 h-3/4">
            <Text className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Routine' : 'New Routine'}</Text>
            
            <Text className="text-textDim text-xs mb-1 uppercase">Name</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700 mb-4"
              placeholder="e.g. Leg Day"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />

            <Text className="text-textDim text-xs mb-2 uppercase">Exercises (Touch to select)</Text>
            <ScrollView className="flex-1 mb-4 bg-background rounded-lg p-2 border border-gray-700">
               {exercises.map(ex => (
                 <Pressable
                   key={ex.id}
                   onPress={() => toggleExerciseSelection(ex.id)}
                   className={clsx(
                     "p-3 mb-2 rounded-lg border flex-row justify-between items-center",
                     selectedExerciseIds.includes(ex.id) ? "bg-secondary/20 border-secondary" : "bg-surface border-gray-800"
                   )}
                 >
                   <Text className={clsx("font-bold", selectedExerciseIds.includes(ex.id) ? "text-secondary" : "text-text")}>{ex.name}</Text>
                   {selectedExerciseIds.includes(ex.id) && <Ionicons name="checkmark-circle" size={20} color="#4ade80" />}
                 </Pressable>
               ))}
            </ScrollView>

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
