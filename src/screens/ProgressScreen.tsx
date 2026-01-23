import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';
import { 
  Exercise, 
  listExercises, 
  listSetsForExercise, 
  getWorkoutActivityForMonth,
  getVolumeStats
} from '../db/database';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState<Record<string, number>>({});
  
  // Exercise Selector
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  // Volume Chart State
  const [volumeHistory, setVolumeHistory] = useState<any[]>([]);

  // Detail View
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [exerciseStats, setExerciseStats] = useState({ totalSets: 0, totalVolume: 0, maxWeight: 0, totalReps: 0 });

  // Load Overview
  const loadOverview = async () => {
    try {
       const year = currentDate.getFullYear();
       const month = currentDate.getMonth() + 1; // 1-based for DB
       
       const rawActivity = await getWorkoutActivityForMonth(year, month);
       
       // Convert to Map for O(1) lookups: "YYYY-MM-DD" -> count
       const map: Record<string, number> = {};
       rawActivity.forEach(r => {
           map[r.date] = r.count;
       });
       setMonthData(map);

       // Exercises List
       const exList = await listExercises();
       setExercises(exList);

       // Volume Stats
       const vol = await getVolumeStats();
       const volPoints = vol.map(v => ({
            value: v.volume,
            label: v.month.substring(5), // "MM" (e.g. "01")
            // dataPointText: (v.volume / 1000).toFixed(1) + 'k',
            // labelTextStyle: { color: 'gray', width: 40 },
       }));
       setVolumeHistory(volPoints);
    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
        if (!selectedExercise) loadOverview();
    }, [selectedExercise, currentDate]) // Reload when month changes
  );

  const handlePrevMonth = () => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
  };

  const handleSelectExercise = async (ex: Exercise) => {
      setSelectedExercise(ex);
      try {
        const rawSets = await listSetsForExercise(ex.id);
        
        // Calculate Stats
        const totalSets = rawSets.length;
        const totalVolume = rawSets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
        const totalReps = rawSets.reduce((acc, s) => acc + s.reps, 0);
        const maxW = rawSets.length > 0 ? Math.max(...rawSets.map(s => s.weight)) : 0;
        setExerciseStats({ totalSets, totalVolume, totalReps, maxWeight: maxW });

        const groups: Record<string, number> = {};
        
        rawSets.forEach(set => {
            const date = set.started_at.split('T')[0];
            const w = set.weight;
            if (!groups[date] || w > groups[date]) groups[date] = w;
        });

        const points = Object.entries(groups).map(([date, weight]) => ({
            date,
            value: weight,
            label: date.substring(5), // "MM-DD"
        })).sort((a, b) => a.date.localeCompare(b.date));

        const lineData = points.map(p => ({
            value: p.value,
            label: p.label,
            dataPointText: String(p.value),
            textColor: 'white',
            textShiftY: -10,
            textShiftX: -10,
        }));

        setHistoryData(lineData);
        setRecentHistory(rawSets);
      } catch (e) {
          console.warn(e);
      }
  };

  // --- Render Calendar Grid ---
  // 1. Get days in current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // 2. Get day of week for 1st of month (0=Sun, 1=Mon...)
  // We want Mon=0, Sun=6. JS is Sun=0.
  let startDay = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
  startDay = startDay === 0 ? 6 : startDay - 1; // Shift to Mon start

  const calendarGrid = [];
  // Empty slots
  for(let i=0; i<startDay; i++) {
      calendarGrid.push(null);
  }
  // Days
  for(let i=1; i<=daysInMonth; i++) {
      calendarGrid.push(i);
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (selectedExercise) {
     return (
       <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
         <View className="px-4 py-2 flex-row items-center border-b border-gray-800">
            <Pressable onPress={() => setSelectedExercise(null)} className="p-2 mr-2">
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text className="text-xl font-bold text-white max-w-[80%]">{selectedExercise.name}</Text>
         </View>
         
         <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-6">
                <View className="w-[48%] bg-surface p-3 rounded-xl border border-gray-800 mb-2">
                    <Text className="text-textDim text-xs uppercase font-bold">Total Lifted</Text>
                    <Text className="text-primary text-xl font-bold">{(exerciseStats.totalVolume / 1000).toFixed(1)}t</Text>
                </View>
                <View className="w-[48%] bg-surface p-3 rounded-xl border border-gray-800 mb-2">
                    <Text className="text-textDim text-xs uppercase font-bold">Total Sets</Text>
                    <Text className="text-white text-xl font-bold">{exerciseStats.totalSets}</Text>
                </View>
                <View className="w-[48%] bg-surface p-3 rounded-xl border border-gray-800">
                     <Text className="text-textDim text-xs uppercase font-bold">Max Weight</Text>
                     <Text className="text-white text-xl font-bold">{exerciseStats.maxWeight} kg</Text>
                </View>
                <View className="w-[48%] bg-surface p-3 rounded-xl border border-gray-800">
                     <Text className="text-textDim text-xs uppercase font-bold">Total Reps</Text>
                     <Text className="text-white text-xl font-bold">{exerciseStats.totalReps}</Text>
                </View>
            </View>

            <Text className="text-lg font-bold text-textDim mb-4">Max Weight History</Text>
            
            <View className="bg-surface rounded-2xl p-4 border border-gray-800 mb-6 items-center">
               {historyData.length > 0 ? (
                 <LineChart
                    data={historyData}
                    height={220}
                    width={screenWidth - 80}
                    initialSpacing={20}
                    spacing={40}
                    color="#4ade80"
                    thickness={3}
                    dataPointsColor="#4ade80"
                    textFontSize={12}
                    xAxisLabelTextStyle={{ color: '#aaa', fontSize: 10 }}
                    yAxisTextStyle={{ color: '#aaa', fontSize: 10 }}
                    yAxisColor="#333"
                    xAxisColor="#333"
                    hideRules
                    hideYAxisText={false}
                    yAxisOffset={0}
                    pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 100,
                        pointerLabelHeight: 90,
                        activePointerColor: 'white',
                        pointerComponent: ((items: any) => {
                          return (
                            <View style={{
                                height: 90, 
                                width: 100, 
                                justifyContent: 'center', 
                                marginTop: -30, 
                                marginLeft: -40,
                            }}>
                              <Text style={{ color: 'white', fontSize: 14, marginBottom: 6, textAlign:'center' }}>
                                 {items[0].value}
                              </Text>
                              <View style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:16, backgroundColor:'white'}}>
                                <Text style={{fontWeight:'bold', textAlign:'center'}}>
                                   {items[0].label}
                                </Text>
                              </View>
                            </View>
                          )
                        }) as any // Cast to any to avoid strict type check on pointerComponent
                    }}
                 />
               ) : (
                  <View className="h-40 items-center justify-center">
                      <Text className="text-textDim">No history data yet.</Text>
                  </View>
               )}
            </View>

            <Text className="text-lg font-bold text-textDim mb-2">Recent Sets</Text>
            {recentHistory.map((set, i) => (
                <View key={i} className="bg-surface p-3 rounded-xl mb-2 border border-gray-800 flex-row justify-between">
                    <View>
                        <Text className="text-white font-bold">{set.routine_name || 'Quick Workout'}</Text>
                        <Text className="text-textDim text-xs">{new Date(set.started_at).toLocaleDateString()}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-primary font-bold text-lg">{set.weight} {set.unit || 'kg'}</Text>
                        <Text className="text-textDim text-xs">{set.reps} reps</Text>
                    </View>
                </View>
            ))}
         </ScrollView>
       </View>
     );
  }

  // Overview with Calendar
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-text mb-6">Progress Dashboard</Text>
        
        {/* Calendar Card */}
        <View className="bg-surface p-4 rounded-2xl border border-gray-800 mb-8">
            <View className="flex-row justify-between items-center mb-4">
                <Pressable onPress={handlePrevMonth} className="p-2">
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                </Pressable>
                <Text className="text-white font-bold text-base">{monthName}</Text>
                <Pressable onPress={handleNextMonth} className="p-2">
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>
            </View>
            
            {/* Week Headers */}
            <View className="flex-row mb-2 justify-around">
               {['M','T','W','T','F','S','S'].map((d, i) => (
                   <Text key={i} className="text-textDim text-xs font-bold w-8 text-center">{d}</Text>
               ))}
            </View>

            {/* Grid */}
            <View className="flex-row flex-wrap">
               {calendarGrid.map((day, i) => {
                   const dateStr = day 
                        ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` 
                        : null;
                   const count = dateStr ? monthData[dateStr] : 0;
                   const isActive = count && count > 0;
                   
                   return (
                       <View key={i} className="w-[14.28%] aspect-square p-1">
                           {day ? (
                               <View className={clsx(
                                   "flex-1 items-center justify-center rounded-lg border",
                                   isActive 
                                    ? "bg-primary/20 border-primary" 
                                    : "bg-background border-gray-800"
                               )}>
                                   <Text className={clsx(
                                       "text-xs font-bold",
                                       isActive ? "text-primary" : "text-textDim"
                                   )}>
                                       {day}
                                   </Text>
                               </View>
                           ) : null}
                       </View>
                   );
               })}
            </View>
        </View>

        {/* Volume Chart */}
        <Text className="text-lg font-bold text-textDim mb-4">Overall Strength</Text>
        <View className="bg-surface rounded-2xl p-4 border border-gray-800 mb-8 items-center">
            {volumeHistory.length > 0 ? (
                <LineChart
                    data={volumeHistory}
                    height={180}
                    width={screenWidth - 80}
                    color="#facc15"
                    thickness={3}
                    dataPointsColor="#facc15"
                    hideAxesAndRules
                    hideXAxisText
                    hideYAxisText
                    initialSpacing={20}
                    yAxisOffset={0}
                    pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 100,
                        pointerLabelHeight: 90,
                        activePointerColor: 'white',
                        pointerComponent: ((items: any) => {
                          return (
                            <View style={{
                                height: 90, 
                                width: 100, 
                                justifyContent: 'center', 
                                marginTop: -30, 
                                marginLeft: -40,
                            }}>
                              <Text style={{ color: 'white', fontSize: 14, marginBottom: 6, textAlign:'center' }}>
                                 {(items[0]?.value / 1000).toFixed(1)}t
                              </Text>
                              <View style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:16, backgroundColor:'white'}}>
                                <Text style={{fontWeight:'bold', textAlign:'center', color: 'black'}}>
                                   {items[0]?.label}
                                </Text>
                              </View>
                            </View>
                          )
                        }) as any
                    }}
                />
            ) : (
                <View className="h-40 items-center justify-center">
                    <Text className="text-textDim">Lift more to see data!</Text>
                </View>
            )}
        </View>

        <Text className="text-lg font-bold text-textDim mb-4">Exercise Analytics</Text>
        {exercises.map((ex) => (
            <Pressable 
                key={ex.id}
                onPress={() => handleSelectExercise(ex)}
                className="bg-surface p-4 rounded-xl mb-3 border border-gray-800 flex-row justify-between items-center active:bg-gray-800"
            >
                <View>
                    <Text className="text-white font-bold text-base">{ex.name}</Text>
                    <Text className="text-textDim text-sm">{ex.category || 'Uncategorized'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
            </Pressable>
        ))}
        {exercises.length === 0 && (
            <Text className="text-textDim text-center italic">No exercises found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

