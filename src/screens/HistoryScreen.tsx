import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getWorkoutDetail, listWorkoutHistory, WorkoutSession } from '../db/database';

type WorkoutHistoryItem = WorkoutSession & { routine_name: string };

type DetailState = Record<
  number,
  { entries: { exercise_name: string; id: number }[]; sets: Record<number, { reps: number; weight: number }[]> }
>;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailState>({});

  const loadHistory = async () => {
    try {
      const sessions = await listWorkoutHistory();
      setHistory(sessions);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadDetail = async (sessionId: number) => {
    if (details[sessionId]) {
      return;
    }
    try {
      const detail = await getWorkoutDetail(sessionId);
      setDetails((prev) => ({
        ...prev,
        [sessionId]: {
          entries: detail.entries,
          sets: detail.setsByEntry,
        },
      }));
    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const toggleExpand = async (sessionId: number) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    await loadDetail(sessionId);
    setExpandedId(sessionId);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-text mb-4">History</Text>
        {history.map((session) => (
          <View key={session.id} className="bg-surface rounded-xl mb-3 border border-gray-800 overflow-hidden">
            <Pressable 
              onPress={() => toggleExpand(session.id)}
              className="p-4 active:bg-gray-800"
            >
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-lg font-bold text-secondary">{session.routine_name}</Text>
                <Text className="text-xs text-textDim">
                  {session.ended_at ? formatDuration(session.started_at, session.ended_at) : 'Incomplete'}
                </Text>
              </View>
              <Text className="text-sm text-textDim">{new Date(session.started_at).toLocaleString()}</Text>
            </Pressable>
            
            {expandedId === session.id && details[session.id] && (
              <View className="border-t border-gray-700 p-4 bg-background/50">
                {details[session.id].entries.map((entry) => (
                  <View key={entry.id} className="mb-4">
                    <Text className="text-base font-semibold text-primary mb-2 line-through-none border-b border-gray-800 pb-1 w-full">
                       {entry.exercise_name}
                    </Text>
                    {(details[session.id].sets[entry.id] || []).map((set, index) => (
                      <Text key={`${entry.id}-${index}`} className="text-textDim text-sm ml-2 mb-1">
                        • Set {index + 1}: <Text className="text-text font-bold">{set.reps}</Text> reps @ <Text className="text-text font-bold">{set.weight}</Text> kg
                      </Text>
                    ))}
                    {(details[session.id].sets[entry.id] || []).length === 0 && (
                      <Text className="text-textDim text-xs italic ml-2">No sets recorded</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        {history.length === 0 && (
          <Text className="text-textDim text-center mt-10">No completed workouts yet.</Text>
        )}
      </ScrollView>
    </View>
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

