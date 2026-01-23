import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getActiveSession, listWorkoutHistory, listRoutines, getWeeklyWorkoutCount, getCurrentStreak, getLastCompletedRoutine, getRecentPRs, getMuscleSplit, getLifetimeVolume, Routine, startWorkoutSession } from '../db/database';
import { PieChart, BarChart } from 'react-native-gifted-charts';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  const [activeRoutine, setActiveRoutine] = useState<string | null>(null);
  const [activeStartTime, setActiveStartTime] = useState<string | null>(null);
  const [timer, setTimer] = useState<string | null>(null);

  const [historyCount, setHistoryCount] = useState(0);
  const [routineCount, setRoutineCount] = useState(0);
  const [dailyTip, setDailyTip] = useState("");
  
  // New Stats
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastRoutine, setLastRoutine] = useState<Routine | null>(null);
  const [recentPRs, setRecentPRs] = useState<{ exercise: string; weight: number; oldMax: number; date?: string }[]>([]);
  const [muscleSplit, setMuscleSplit] = useState<{ name: string; count: number; percentage: number }[]>([]);
  const [lifetimeVolume, setLifetimeVolume] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const WEEKLY_GOAL = 4;

  const TIPS = [
      "Consistency beats intensity. Log each set to see steady progress over time.",
      "Stay hydrated! Your muscles need water to perform and recover efficiently.",
      "Rest is just as important as training. Make sure you get quality sleep.",
      "Focus on form over weight. Proper technique prevents injury and maximizes gains.",
      "Track your protein intake to ensure optimal muscle repair.",
      "Progressive overload looks like: more weight, more reps, or better form.",
      "A 30-minute workout is better than no workout at all.",
      "Don't skip the warm-up. It primes your nervous system for heavy lifts.",
      "Train movements, not just muscles. Functional strength translates to real life.",
      "Listen to your body. If something hurts in a bad way, stop and assess."
  ];

  const loadData = async () => {
    try {
      // Daily Tip
      const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      setDailyTip(TIPS[dayIndex % TIPS.length]);

      const activeSession = await getActiveSession();
      // Only show active session if it started less than 12 hours ago
      if (activeSession) {
          const start = new Date(activeSession.session.started_at).getTime();
          const now = Date.now();
          if ((now - start) < 12 * 60 * 60 * 1000) {
              setActiveRoutine(activeSession.session.routine_name);
              setActiveStartTime(activeSession.session.started_at);
          } else {
             setActiveRoutine(null);
             setActiveStartTime(null);
             setTimer(null);
          }
      } else {
          setActiveRoutine(null);
          setActiveStartTime(null);
          setTimer(null);
      }
      
      const history = await listWorkoutHistory();
      setHistoryCount(history.length);
      const routines = await listRoutines();
      setRoutineCount(routines.length);

      // New Data
      const weekly = await getWeeklyWorkoutCount();
      setWeeklyCount(weekly);
      const s = await getCurrentStreak();
      setStreak(s);
      const lr = await getLastCompletedRoutine();
      setLastRoutine(lr);
      const prs = await getRecentPRs();
      setRecentPRs(prs);
      
      const split = await getMuscleSplit();
      setMuscleSplit(split);
      const vol = await getLifetimeVolume();
      setLifetimeVolume(vol);

    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const handleStartQuickRoutine = async () => {
      if (lastRoutine) {
          try {
              await startWorkoutSession(lastRoutine.id);
              loadData(); // Reload to show active session
              navigation.navigate('Workout');
          } catch(e) { console.error(e); }
      }
  };


  // Timer Effect
  const [isBackdated, setIsBackdated] = useState(false);

  useEffect(() => {
    if (!activeStartTime) {
        setIsBackdated(false);
        return;
    }

    const interval = setInterval(() => {
        const start = new Date(activeStartTime).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);

        if (diff < 0) {
            setTimer("00:00:00");
            return;
        }

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimer(
            `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
        );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStartTime]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, []);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ade80" />
        }
      >
        <View className="flex-row justify-between items-center mb-6">
            <View>
                <Text className="text-3xl font-bold text-text">Welcome back!</Text>
                <Text className="text-textDim">Let's crush today's workout.</Text>
            </View>
            <View className="flex-row items-center bg-surface px-3 py-1 rounded-full border border-gray-800">
                <Text className="text-orange-500 font-bold mr-1">{streak}</Text>
                <Ionicons name="flame" size={20} color="#f97316" />
            </View>
        </View>

        {/* Weekly Goal Ring */}
        <View className="flex-row mb-6 gap-4">
             <View className="flex-1 bg-surface p-4 rounded-xl border border-gray-800 justify-center items-center">
                 <PieChart
                    data={[
                        { value: weeklyCount, color: '#4ade80' },
                        { value: Math.max(0, WEEKLY_GOAL - weeklyCount), color: '#333' }
                    ]}
                    donut
                    radius={35}
                    innerRadius={28}
                    innerCircleColor="#1E1E1E"
                    centerLabelComponent={() => (
                        <Text className="text-white font-bold text-xl">{weeklyCount}/{WEEKLY_GOAL}</Text>
                    )}
                 />
                 <Text className="text-textDim text-xs mt-2 font-bold uppercase">Weekly Goal</Text>
             </View>
             
             {/* Quick Stats or Action */}
             <View className="flex-1 gap-2">
                 <View className="flex-1 bg-surface p-3 rounded-xl border border-gray-800 justify-center items-center">
                    <Text className="text-xl font-bold text-secondary">{(lifetimeVolume / 1000).toFixed(0)}t</Text>
                    <Text className="text-textDim text-[10px] uppercase font-bold">Total Vol</Text>
                 </View>
                 <View className="flex-1 bg-surface p-3 rounded-xl border border-gray-800 justify-center items-center">
                    <Text className="text-xl font-bold text-white">{historyCount}</Text>
                    <Text className="text-textDim text-[10px] uppercase font-bold">Workouts</Text>
                 </View>
             </View>
        </View>
        
        {/* Active Session OR Quick Start */}
        {activeRoutine ? (
            <Pressable 
                onPress={() => navigation.navigate('Workout')}
                className="bg-surface p-4 rounded-xl mb-6 border border-primary/50 active:bg-gray-800 flex-row justify-between items-center"
            >
                <View>
                    <Text className="text-lg font-semibold text-primary mb-1">Active Session</Text>
                    <Text className="text-base text-white font-bold">{activeRoutine}</Text>
                    <Text className="text-textDim text-sm mt-1">Tap to continue...</Text>
                </View>
                <View className="items-end">
                     <Ionicons name="fitness" size={24} color="#4ade80" />
                     {timer && (
                        <Text className="text-primary font-mono text-lg font-bold mt-2">{timer}</Text>
                     )}
                </View>
            </Pressable>
        ) : lastRoutine ? (
            <Pressable 
                onPress={handleStartQuickRoutine}
                className="bg-surface p-4 rounded-xl mb-6 border border-gray-800 active:bg-gray-800 flex-row items-center justify-between"
            >
                <View>
                    <Text className="text-primary font-bold text-lg mb-1">Quick Start</Text>
                    <Text className="text-textDim text-sm">Repeat: <Text className="text-white font-bold">{lastRoutine.name}</Text></Text>
                </View>
                <View className="bg-primary/20 p-3 rounded-full">
                    <Ionicons name="play" size={24} color="#4ade80" />
                </View>
            </Pressable>
        ) : (
             <View className="bg-surface p-4 rounded-xl mb-6 border border-gray-800">
                <Text className="text-lg font-semibold text-primary mb-2">Ready to start?</Text>
                <Text className="text-base text-gray-300">Go to Routines to create your first workout.</Text>
            </View>
        )}

        {/* PRs Card */}
        {recentPRs.length > 0 && (
            <View className="mb-6">
                <Text className="text-lg font-bold text-textDim mb-3">🏆 New Records</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {recentPRs.map((pr, i) => (
                        <View key={i} className="bg-surface p-4 rounded-xl border border-gray-800 mr-3 min-w-[140px]">
                            <Text className="text-white font-bold mb-1" numberOfLines={1}>{pr.exercise}</Text>
                            <Text className="text-yellow-400 font-bold text-xl">{pr.weight} kg</Text>
                            <Text className="text-textDim text-xs">was {pr.oldMax} kg</Text>
                            {/* <Text className="text-gray-500 text-[10px] mt-1">{new Date(pr.date).toLocaleDateString()}</Text> */}
                        </View>
                    ))}
                </ScrollView>
            </View>
        )}
        
        {/* Muscle Split */}
        {muscleSplit.length > 0 && (
            <View className="mb-6">
                <Text className="text-lg font-bold text-textDim mb-3">Monthly Focus</Text>
                <View className="bg-surface p-4 rounded-xl border border-gray-800">
                    {muscleSplit.map((m, i) => (
                        <View key={i} className="mb-3 ">
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-white font-bold text-sm capitalize">{m.name}</Text>
                                <Text className="text-textDim text-xs">{(m.percentage * 100).toFixed(0)}%</Text>
                            </View>
                            <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <View 
                                    className="h-full bg-primary" 
                                    style={{ width: `${m.percentage * 100}%` }} 
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        )}

        <View className="bg-surface p-4 rounded-xl mb-4 border border-gray-800">
          <Text className="text-lg font-semibold text-primary mb-2">Tip of the Day</Text>
          <Text className="text-base text-gray-400 italic">
            "{dailyTip}"
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

