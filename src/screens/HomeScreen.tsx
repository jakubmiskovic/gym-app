import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getActiveSession, listWorkoutHistory, listRoutines } from '../db/database';

export default function HomeScreen() {
  const [activeRoutine, setActiveRoutine] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [routineCount, setRoutineCount] = useState(0);

  const loadData = async () => {
    const activeSession = await getActiveSession();
    setActiveRoutine(activeSession ? activeSession.session.routine_name : null);
    const history = await listWorkoutHistory();
    setHistoryCount(history.length);
    const routines = await listRoutines();
    setRoutineCount(routines.length);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome back!</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Session</Text>
        <Text style={styles.cardText}>
          {activeRoutine ? `Currently training: ${activeRoutine}` : 'No active workout.'}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{routineCount}</Text>
          <Text style={styles.statLabel}>Routines</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{historyCount}</Text>
          <Text style={styles.statLabel}>Workouts logged</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tip of the day</Text>
        <Text style={styles.cardText}>
          Consistency beats intensity. Log each set to see steady progress over time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f4f4f4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#444',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    color: '#555',
  },
});
