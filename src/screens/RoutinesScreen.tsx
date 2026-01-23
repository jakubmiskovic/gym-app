import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  createExercise,
  createRoutine,
  deleteExercise,
  deleteRoutine,
  Exercise,
  getRoutineExercises,
  listExercises,
  listRoutines,
  Routine,
  startWorkoutSession,
  updateExercise,
  updateRoutine,
} from '../db/database';

const emptyForm = {
  name: '',
  category: '',
};

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [exerciseForm, setExerciseForm] = useState(emptyForm);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const loadData = async () => {
    try {
      const [routineList, exerciseList] = await Promise.all([listRoutines(), listExercises()]);
      setRoutines(routineList);
      setExercises(exerciseList);
    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const isFormValid = useMemo(() => {
    return routineName.trim().length > 0 && selectedExerciseIds.length > 0;
  }, [routineName, selectedExerciseIds]);

  const handleSelectRoutine = async (routine: Routine) => {
    const routineExercises = await getRoutineExercises(routine.id);
    setRoutineName(routine.name);
    setSelectedExerciseIds(routineExercises.map((exercise) => exercise.id));
    setEditingRoutine(routine);
  };

  const handleSaveRoutine = async () => {
    if (!isFormValid) {
      Alert.alert('Missing info', 'Provide a routine name and select exercises.');
      return;
    }
    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, routineName.trim(), selectedExerciseIds);
      } else {
        await createRoutine(routineName.trim(), selectedExerciseIds);
      }
      setRoutineName('');
      setSelectedExerciseIds([]);
      setEditingRoutine(null);
      await loadData();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Could not save routine.');
    }
  };

  const handleDeleteRoutine = async (routine: Routine) => {
    try {
      await deleteRoutine(routine.id);
      if (editingRoutine?.id === routine.id) {
        setEditingRoutine(null);
        setRoutineName('');
        setSelectedExerciseIds([]);
      }
      await loadData();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Could not delete routine.');
    }
  };

  const handleExerciseToggle = (exerciseId: number) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleStartWorkout = async (routineId: number) => {
    try {
      await startWorkoutSession(routineId);
      Alert.alert('Workout started', 'Head to the Workout tab to log sets.');
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Could not start workout.');
    }
  };

  const handleExerciseSave = async () => {
    if (!exerciseForm.name.trim()) {
      Alert.alert('Missing info', 'Exercise name is required.');
      return;
    }

    try {
      if (editingExercise) {
        await updateExercise(editingExercise.id, exerciseForm.name.trim(), exerciseForm.category.trim());
      } else {
        await createExercise(exerciseForm.name.trim(), exerciseForm.category.trim());
      }
      setExerciseForm(emptyForm);
      setEditingExercise(null);
      await loadData();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Could not save exercise.');
    }
  };

  const handleExerciseEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      name: exercise.name,
      category: exercise.category ?? '',
    });
  };

  const handleExerciseDelete = async (exercise: Exercise) => {
    try {
      await deleteExercise(exercise.id);
      if (editingExercise?.id === exercise.id) {
        setEditingExercise(null);
        setExerciseForm(emptyForm);
      }
      await loadData();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Could not delete exercise.');
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-text mb-4">Routines</Text>
        
        <View className="bg-surface p-4 rounded-xl mb-6 border border-gray-800">
          <Text className="text-lg font-semibold text-primary mb-3">
            {editingRoutine ? 'Edit Routine' : 'New Routine'}
          </Text>
          <TextInput
            className="bg-background text-text border border-gray-700 rounded-lg p-3 mb-4"
            placeholder="Routine name"
            placeholderTextColor="#666"
            value={routineName}
            onChangeText={setRoutineName}
          />
          <Text className="text-sm text-textDim mb-2">Select exercises in order:</Text>
          <View className="bg-background rounded-lg p-2 border border-gray-800 mb-4 max-h-48">
            <ScrollView nestedScrollEnabled>
              {exercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => handleExerciseToggle(exercise.id)}
                  className={`p-3 rounded-lg border mb-2 ${
                    selectedExerciseIds.includes(exercise.id)
                      ? 'bg-primary/20 border-primary'
                      : 'bg-surface border-gray-700'
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      selectedExerciseIds.includes(exercise.id) ? 'text-primary' : 'text-text'
                    }`}
                  >
                    {exercise.name}
                  </Text>
                  <Text className="text-xs text-textDim">{exercise.category || 'Uncategorized'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          
          <Pressable
            onPress={handleSaveRoutine}
            className={`p-3 rounded-lg items-center mt-2 ${
              isFormValid ? 'bg-primary' : 'bg-gray-700 opacity-50'
            }`}
            disabled={!isFormValid}
          >
            <Text className="text-background font-bold text-base">
              {editingRoutine ? 'Update Routine' : 'Create Routine'}
            </Text>
          </Pressable>
          
          {editingRoutine && (
            <Pressable
              onPress={() => {
                setEditingRoutine(null);
                setRoutineName('');
                setSelectedExerciseIds([]);
              }}
              className="mt-3 p-3 rounded-lg border border-gray-600 items-center"
            >
              <Text className="text-textDim">Cancel Edit</Text>
            </Pressable>
          )}
        </View>

        {routines.map((routine) => (
          <View key={routine.id} className="bg-surface p-4 rounded-xl mb-4 border border-gray-800">
            <Text className="text-lg font-bold text-text mb-3">{routine.name}</Text>
            <View className="flex-row gap-2">
              <Pressable 
                className="bg-gray-700 px-4 py-2 rounded-lg" 
                onPress={() => handleSelectRoutine(routine)}
              >
                <Text className="text-text font-semibold">Edit</Text>
              </Pressable>
              <Pressable 
                className="bg-secondary px-4 py-2 rounded-lg" 
                onPress={() => handleStartWorkout(routine.id)}
              >
                <Text className="text-background font-bold">Start</Text>
              </Pressable>
              <Pressable 
                className="bg-danger px-4 py-2 rounded-lg ml-auto" 
                onPress={() => handleDeleteRoutine(routine)}
              >
                <Text className="text-white font-semibold">Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text className="text-2xl font-bold text-text mt-6 mb-4">Exercise Library</Text>
        <View className="bg-surface p-4 rounded-xl mb-4 border border-gray-800">
          <Text className="text-lg font-semibold text-primary mb-3">
            {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
          </Text>
          <TextInput
            className="bg-background text-text border border-gray-700 rounded-lg p-3 mb-3"
            placeholder="Exercise name"
            placeholderTextColor="#666"
            value={exerciseForm.name}
            onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, name: value }))}
          />
          <TextInput
            className="bg-background text-text border border-gray-700 rounded-lg p-3 mb-4"
            placeholder="Category (optional)"
            placeholderTextColor="#666"
            value={exerciseForm.category ?? ''}
            onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, category: value }))}
          />
          <Pressable 
            className="bg-primary p-3 rounded-lg items-center" 
            onPress={handleExerciseSave}
          >
            <Text className="text-background font-bold text-base">
              {editingExercise ? 'Update Exercise' : 'Create Exercise'}
            </Text>
          </Pressable>
          {editingExercise && (
            <Pressable
              onPress={() => {
                setEditingExercise(null);
                setExerciseForm(emptyForm);
              }}
              className="mt-3 p-3 rounded-lg border border-gray-600 items-center"
            >
              <Text className="text-textDim">Cancel Edit</Text>
            </Pressable>
          )}
        </View>

        {exercises.map((exercise) => (
          <View key={exercise.id} className="bg-surface p-4 rounded-xl mb-3 border border-gray-800 flex-row items-center justify-between">
            <View>
              <Text className="text-base font-semibold text-text">{exercise.name}</Text>
              <Text className="text-xs text-textDim">{exercise.category || 'Uncategorized'}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable 
                className="bg-gray-700 px-3 py-2 rounded-lg" 
                onPress={() => handleExerciseEdit(exercise)}
              >
                <Text className="text-text text-xs font-semibold">Edit</Text>
              </Pressable>
              <Pressable 
                className="bg-danger px-3 py-2 rounded-lg" 
                onPress={() => handleExerciseDelete(exercise)}
              >
                <Text className="text-white text-xs font-semibold">Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

