import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Exercise, listExercises, listSetsForExercise } from '../db/database';

type SetWithSession = {
  id: number;
  reps: number;
  weight: number;
  started_at: string;
  routine_name: string;
};

export default function ProgressScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<SetWithSession[]>([]);

  const loadExercises = async () => {
    const list = await listExercises();
    setExercises(list);
  };

  const loadProgress = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    const history = await listSetsForExercise(exercise.id);
    setSets(history);
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const prWeight = sets.reduce((max, set) => Math.max(max, set.weight), 0);
  const prReps = sets.reduce((max, set) => Math.max(max, set.reps), 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Pick an exercise to review history.</Text>
      {exercises.map((exercise) => (
        <Pressable
          key={exercise.id}
          style={[
            styles.exerciseRow,
            selectedExercise?.id === exercise.id && styles.exerciseRowActive,
          ]}
          onPress={() => loadProgress(exercise)}
        >
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseCategory}>{exercise.category || 'Uncategorized'}</Text>
        </Pressable>
      ))}
      {selectedExercise ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PRs for {selectedExercise.name}</Text>
          <Text style={styles.cardText}>Max weight: {prWeight} kg</Text>
          <Text style={styles.cardText}>Best reps: {prReps}</Text>
        </View>
      ) : null}
      {selectedExercise ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Set History</Text>
          {sets.map((set, index) => (
            <View key={`${set.id}-${index}`} style={styles.setRow}>
              <Text style={styles.setText}>
                {new Date(set.started_at).toLocaleDateString()} - {set.reps} reps @ {set.weight} kg
              </Text>
              <Text style={styles.setSub}>{set.routine_name}</Text>
            </View>
          ))}
          {sets.length === 0 ? (
            <Text style={styles.emptyText}>No sets logged for this exercise yet.</Text>
          ) : null}
        </View>
      ) : null}
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
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: '#666',
  },
  exerciseRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  exerciseRowActive: {
    borderColor: '#2d6cdf',
    backgroundColor: '#eef5ff',
  },
  exerciseName: {
    fontWeight: '600',
  },
  exerciseCategory: {
    color: '#666',
  },
  card: {
    marginTop: 12,
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    color: '#333',
    marginBottom: 4,
  },
  setRow: {
    marginBottom: 10,
  },
  setText: {
    fontWeight: '500',
  },
  setSub: {
    color: '#666',
  },
  emptyText: {
    color: '#777',
  },
});
