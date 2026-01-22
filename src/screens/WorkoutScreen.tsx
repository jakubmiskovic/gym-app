import React, { useEffect, useState } from 'react';
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
  addSet,
  getActiveSession,
  listRoutines,
  listSetsForEntry,
  markEntryDone,
  Routine,
  startWorkoutSession,
  finishWorkoutSession,
  WorkoutEntry,
} from '../db/database';

type ActiveSession = NonNullable<Awaited<ReturnType<typeof getActiveSession>>>;

type EntryWithSets = {
  entry: WorkoutEntry & { exercise_name: string };
  sets: { id: number; reps: number; weight: number }[];
};

export default function WorkoutScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [entriesWithSets, setEntriesWithSets] = useState<EntryWithSets[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const loadRoutines = async () => {
    const routineList = await listRoutines();
    setRoutines(routineList);
  };

  const loadActiveSession = async () => {
    const session = await getActiveSession();
    setActiveSession(session);
    if (session) {
      const entries = await Promise.all(
        session.entries.map(async (entry) => ({
          entry,
          sets: await listSetsForEntry(entry.id),
        }))
      );
      setEntriesWithSets(entries);
      setSelectedEntryId(session.entries[0]?.id ?? null);
    } else {
      setEntriesWithSets([]);
      setSelectedEntryId(null);
    }
  };

  useEffect(() => {
    loadRoutines();
    loadActiveSession();
  }, []);

  const handleStartWorkout = async (routineId: number) => {
    await startWorkoutSession(routineId);
    await loadActiveSession();
  };

  const handleAddSet = async () => {
    const repsValue = Number(reps);
    const weightValue = Number(weight);
    if (!selectedEntryId) {
      Alert.alert('Select exercise', 'Pick an exercise before logging a set.');
      return;
    }
    if (Number.isNaN(repsValue) || repsValue <= 0) {
      Alert.alert('Invalid reps', 'Reps must be a positive integer.');
      return;
    }
    if (Number.isNaN(weightValue) || weightValue < 0) {
      Alert.alert('Invalid weight', 'Weight must be 0 or greater.');
      return;
    }
    await addSet(selectedEntryId, repsValue, weightValue);
    setReps('');
    setWeight('');
    await loadActiveSession();
  };

  const handleToggleDone = async (entryId: number, isDone: boolean) => {
    await markEntryDone(entryId, !isDone);
    await loadActiveSession();
  };

  const handleFinishWorkout = async () => {
    if (!activeSession) {
      return;
    }
    await finishWorkoutSession(activeSession.session.id);
    await loadActiveSession();
    Alert.alert('Workout saved', 'Your session is now in history.');
  };

  if (!activeSession) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Start a Workout</Text>
        {routines.map((routine) => (
          <Pressable
            key={routine.id}
            onPress={() => handleStartWorkout(routine.id)}
            style={styles.routineCard}
          >
            <Text style={styles.cardTitle}>{routine.name}</Text>
            <Text style={styles.cardSub}>Tap to begin</Text>
          </Pressable>
        ))}
        {routines.length === 0 ? (
          <Text style={styles.emptyText}>Create a routine first.</Text>
        ) : null}
      </ScrollView>
    );
  }

  const selectedEntry = entriesWithSets.find((entry) => entry.entry.id === selectedEntryId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Active Workout</Text>
      <Text style={styles.subtitle}>{activeSession.session.routine_name}</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        {entriesWithSets.map(({ entry }) => (
          <Pressable
            key={entry.id}
            onPress={() => setSelectedEntryId(entry.id)}
            style={[
              styles.selectRow,
              selectedEntryId === entry.id && styles.selectRowActive,
            ]}
          >
            <View style={styles.exerciseRow}>
              <Text style={styles.selectText}>{entry.exercise_name}</Text>
              <Pressable onPress={() => handleToggleDone(entry.id, Boolean(entry.is_done))}>
                <Text style={styles.doneTag}>{entry.is_done ? 'Done' : 'Mark done'}</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>
      {selectedEntry ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Log Sets: {selectedEntry.entry.exercise_name}</Text>
          {selectedEntry.sets.map((set, index) => (
            <Text key={set.id} style={styles.setRow}>
              Set {index + 1}: {set.reps} reps @ {set.weight} kg
            </Text>
          ))}
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Reps"
              keyboardType="numeric"
              value={reps}
              onChangeText={setReps}
            />
            <TextInput
              style={styles.input}
              placeholder="Weight"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
          <Pressable style={styles.primaryButton} onPress={handleAddSet}>
            <Text style={styles.primaryButtonText}>Add Set</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable style={styles.finishButton} onPress={handleFinishWorkout}>
        <Text style={styles.primaryButtonText}>Finish Workout</Text>
      </Pressable>
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
    color: '#555',
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  routineCard: {
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
  emptyText: {
    marginTop: 12,
    color: '#777',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectRow: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  selectRowActive: {
    backgroundColor: '#dff4ff',
    borderColor: '#5bc0de',
  },
  selectText: {
    fontWeight: '600',
  },
  doneTag: {
    color: '#2d6cdf',
    fontWeight: '600',
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setRow: {
    marginBottom: 6,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2d6cdf',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  finishButton: {
    backgroundColor: '#2d6cdf',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
