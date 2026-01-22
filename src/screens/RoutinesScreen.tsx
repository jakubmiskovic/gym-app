import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [exerciseForm, setExerciseForm] = useState(emptyForm);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const loadData = async () => {
    const [routineList, exerciseList] = await Promise.all([listRoutines(), listExercises()]);
    setRoutines(routineList);
    setExercises(exerciseList);
  };

  useEffect(() => {
    loadData();
  }, []);

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
    if (editingRoutine) {
      await updateRoutine(editingRoutine.id, routineName.trim(), selectedExerciseIds);
    } else {
      await createRoutine(routineName.trim(), selectedExerciseIds);
    }
    setRoutineName('');
    setSelectedExerciseIds([]);
    setEditingRoutine(null);
    await loadData();
  };

  const handleDeleteRoutine = async (routine: Routine) => {
    await deleteRoutine(routine.id);
    if (editingRoutine?.id === routine.id) {
      setEditingRoutine(null);
      setRoutineName('');
      setSelectedExerciseIds([]);
    }
    await loadData();
  };

  const handleExerciseToggle = (exerciseId: number) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleStartWorkout = async (routineId: number) => {
    await startWorkoutSession(routineId);
    Alert.alert('Workout started', 'Head to the Workout tab to log sets.');
  };

  const handleExerciseSave = async () => {
    if (!exerciseForm.name.trim()) {
      Alert.alert('Missing info', 'Exercise name is required.');
      return;
    }

    if (editingExercise) {
      await updateExercise(editingExercise.id, exerciseForm.name.trim(), exerciseForm.category.trim());
    } else {
      await createExercise(exerciseForm.name.trim(), exerciseForm.category.trim());
    }
    setExerciseForm(emptyForm);
    setEditingExercise(null);
    await loadData();
  };

  const handleExerciseEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      name: exercise.name,
      category: exercise.category ?? '',
    });
  };

  const handleExerciseDelete = async (exercise: Exercise) => {
    await deleteExercise(exercise.id);
    if (editingExercise?.id === exercise.id) {
      setEditingExercise(null);
      setExerciseForm(emptyForm);
    }
    await loadData();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Routines</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingRoutine ? 'Edit Routine' : 'New Routine'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Routine name"
          value={routineName}
          onChangeText={setRoutineName}
        />
        <Text style={styles.label}>Select exercises in order</Text>
        {exercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() => handleExerciseToggle(exercise.id)}
            style={[
              styles.selectRow,
              selectedExerciseIds.includes(exercise.id) && styles.selectRowActive,
            ]}
          >
            <Text style={styles.selectText}>{exercise.name}</Text>
            <Text style={styles.selectSub}>{exercise.category || 'Uncategorized'}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={handleSaveRoutine}
          style={[styles.primaryButton, !isFormValid && styles.buttonDisabled]}
          disabled={!isFormValid}
        >
          <Text style={styles.primaryButtonText}>
            {editingRoutine ? 'Update Routine' : 'Create Routine'}
          </Text>
        </Pressable>
        {editingRoutine ? (
          <Pressable
            onPress={() => {
              setEditingRoutine(null);
              setRoutineName('');
              setSelectedExerciseIds([]);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {routines.map((routine) => (
        <View key={routine.id} style={styles.listCard}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          <View style={styles.rowButtons}>
            <Pressable style={styles.smallButton} onPress={() => handleSelectRoutine(routine)}>
              <Text style={styles.smallButtonText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={() => handleStartWorkout(routine.id)}>
              <Text style={styles.smallButtonText}>Start</Text>
            </Pressable>
            <Pressable style={styles.destructiveButton} onPress={() => handleDeleteRoutine(routine)}>
              <Text style={styles.smallButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.title}>Exercise Library</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Exercise name"
          value={exerciseForm.name}
          onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, name: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (optional)"
          value={exerciseForm.category}
          onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, category: value }))}
        />
        <Pressable style={styles.primaryButton} onPress={handleExerciseSave}>
          <Text style={styles.primaryButtonText}>
            {editingExercise ? 'Update Exercise' : 'Create Exercise'}
          </Text>
        </Pressable>
        {editingExercise ? (
          <Pressable
            onPress={() => {
              setEditingExercise(null);
              setExerciseForm(emptyForm);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
          </Pressable>
        ) : null}
      </View>
      {exercises.map((exercise) => (
        <View key={exercise.id} style={styles.listCard}>
          <Text style={styles.cardTitle}>{exercise.name}</Text>
          <Text style={styles.cardSub}>{exercise.category || 'Uncategorized'}</Text>
          <View style={styles.rowButtons}>
            <Pressable style={styles.smallButton} onPress={() => handleExerciseEdit(exercise)}>
              <Text style={styles.smallButtonText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.destructiveButton} onPress={() => handleExerciseDelete(exercise)}>
              <Text style={styles.smallButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  listCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    marginTop: 4,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
  },
  selectRow: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectRowActive: {
    backgroundColor: '#dff4ff',
    borderColor: '#5bc0de',
  },
  selectText: {
    fontWeight: '600',
  },
  selectSub: {
    color: '#666',
  },
  primaryButton: {
    backgroundColor: '#2d6cdf',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#2d6cdf',
  },
  destructiveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#d9534f',
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
