import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getWorkoutDetail, listWorkoutHistory, WorkoutSession } from '../db/database';

type WorkoutHistoryItem = WorkoutSession & { routine_name: string };

type DetailState = Record<
  number,
  { entries: { exercise_name: string; id: number }[]; sets: Record<number, { reps: number; weight: number }[]> }
>;

export default function HistoryScreen() {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailState>({});

  const loadHistory = async () => {
    const sessions = await listWorkoutHistory();
    setHistory(sessions);
  };

  const loadDetail = async (sessionId: number) => {
    if (details[sessionId]) {
      return;
    }
    const detail = await getWorkoutDetail(sessionId);
    setDetails((prev) => ({
      ...prev,
      [sessionId]: {
        entries: detail.entries,
        sets: detail.setsByEntry,
      },
    }));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleExpand = async (sessionId: number) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    await loadDetail(sessionId);
    setExpandedId(sessionId);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>History</Text>
      {history.map((session) => (
        <View key={session.id} style={styles.card}>
          <Pressable onPress={() => toggleExpand(session.id)}>
            <Text style={styles.cardTitle}>{session.routine_name}</Text>
            <Text style={styles.cardSub}>{new Date(session.started_at).toLocaleString()}</Text>
            <Text style={styles.cardSub}>
              Duration: {session.ended_at ? formatDuration(session.started_at, session.ended_at) : 'N/A'}
            </Text>
          </Pressable>
          {expandedId === session.id && details[session.id] ? (
            <View style={styles.detailBlock}>
              {details[session.id].entries.map((entry) => (
                <View key={entry.id} style={styles.entryBlock}>
                  <Text style={styles.entryTitle}>{entry.exercise_name}</Text>
                  {(details[session.id].sets[entry.id] || []).map((set, index) => (
                    <Text key={`${entry.id}-${index}`} style={styles.entrySet}>
                      Set {index + 1}: {set.reps} reps @ {set.weight} kg
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No completed workouts yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const formatDuration = (start: string, end: string) => {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  const diffMinutes = Math.max(0, Math.floor((endDate - startDate) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${minutes}m`;
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
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
  detailBlock: {
    marginTop: 12,
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 8,
  },
  entryBlock: {
    marginBottom: 12,
  },
  entryTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  entrySet: {
    color: '#444',
  },
  emptyText: {
    marginTop: 20,
    color: '#777',
  },
});
