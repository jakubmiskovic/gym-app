import React, { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';
import RNDateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import {
  addSet,
  updateSet,
  deleteSet,
  getActiveSession,
  listRoutines,
  listSetsForEntry,
  markEntryDone,
  Routine,
  startWorkoutSession,
  finishWorkoutSession,
  ensureQuickRoutine,
  listExercises,
  addExerciseToSession,
  deleteWorkoutSession,
  updateWorkoutSessionDate,
  WorkoutEntry,
  Exercise,
} from '../db/database';

type ActiveSession = NonNullable<Awaited<ReturnType<typeof getActiveSession>>>;

type EntryWithSets = {
  entry: WorkoutEntry & { exercise_name: string };
  sets: { id: number; reps: number; weight: number; unit?: string }[];
};

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [entriesWithSets, setEntriesWithSets] = useState<EntryWithSets[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [timer, setTimer] = useState<string | null>(null);
  
  // Rest Timer
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(60); // Default 60s

  // Exercise Selector
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);

  // Backdating
  const [backdateMode, setBackdateMode] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState(new Date());
  const [pendingRoutineId, setPendingRoutineId] = useState<number | null>(null);
  
  // Finish Backdate
  const [finishDatePickerVisible, setFinishDatePickerVisible] = useState(false);
  const [finishDate, setFinishDate] = useState(new Date());

  // Timer Effect
  useEffect(() => {
    if (!activeSession) {
        setTimer(null);
        return;
    }

    const start = new Date(activeSession.session.started_at).getTime();
    const now = new Date().getTime();
    
    // If session is older than 12 hours, assume it's backdated/past -> don't tick
    if ((now - start) > 12 * 60 * 60 * 1000) {
        setTimer(null); 
        return;
    }

    const updateTimer = () => {
        const currentNow = new Date().getTime();
        const diff = Math.floor((currentNow - start) / 1000);

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
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android: 'dismissed' means cancelled. 'set' means OK.
    if (Platform.OS === 'android') {
        if (event.type === 'dismissed') {
            setDatePickerVisible(false);
            setPendingRoutineId(null);
            return;
        }
        if (event.type === 'set') {
            const currentDate = selectedDate || tempDate;
            
            // BACKLOG MODE: Update session date
            if (activeSession && datePickerMode === 'date') {
               setDatePickerVisible(false);
               updateWorkoutSessionDate(activeSession.session.id, currentDate.toISOString())
                  .then(() => loadActiveSession())
                  .catch(console.error);
               return;
            }
            
            setDatePickerVisible(false);
            setTempDate(currentDate);
            // ... legacy start flow if needed ...
        }
    } else {
        // iOS: The onChange event fires for every spinner tick. We must NOT close here.
        // We only update the temp date state.
        if (selectedDate) {
            setTempDate(selectedDate);
        }
    }
  };

  const finalizeStart = (date: Date) => {
      // No longer used in new flow, but keeping signature safe or just deleting
  };

  const confirmIOSDate = () => {
    setDatePickerVisible(false);
    if (activeSession) {
        updateWorkoutSessionDate(activeSession.session.id, tempDate.toISOString())
          .then(() => loadActiveSession())
          .catch(console.error);
    }
  };

  const onFinishDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed') {
          setFinishDatePickerVisible(false);
          return;
      }
      
      const currentDate = selectedDate || finishDate;

      if (Platform.OS === 'android') {
        setFinishDatePickerVisible(false);
        setFinishDate(currentDate);

        if (datePickerMode === 'date') {
            setDatePickerMode('time');
            setTimeout(() => setFinishDatePickerVisible(true), 100);
        } else {
            finalizeFinish(currentDate);
        }
      } else {
        // iOS
        setFinishDate(currentDate);
      }
  };

  const finalizeFinish = (date: Date) => {
    if (!activeSession) return;
    finishWorkoutSession(activeSession.session.id, date.toISOString())
    .then(() => {
        setActiveSession(null);
        setEntriesWithSets([]);
        setSelectedEntryId(null);
    })
    .catch(console.error);
  };

  const confirmIOSFinish = () => {
      setFinishDatePickerVisible(false);
      finalizeFinish(finishDate);
  };

  const loadRoutines = async () => {
    try {
      const routineList = await listRoutines();
      setRoutines(routineList);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadExercises = async () => {
    try {
      const list = await listExercises();
      setAllExercises(list);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadActiveSession = async () => {
    try {
      const result = await getActiveSession();
      if (!result) {
        setActiveSession(null);
        setEntriesWithSets([]);
        return;
      }
      setActiveSession(result);

      // Load sets for each entry
      const combined: EntryWithSets[] = [];
      for (const entry of result.entries) {
        const sets = await listSetsForEntry(entry.id);
        combined.push({ entry, sets });
      }
      setEntriesWithSets(combined);

      // Default selection
      if (!selectedEntryId && combined.length > 0) {
        setSelectedEntryId(combined[0].entry.id);
      } else if (selectedEntryId && !combined.find(c => c.entry.id === selectedEntryId)) {
        // If selection invalid, select first
        if (combined.length > 0) {
            setSelectedEntryId(combined[0].entry.id);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadRoutines();
      loadActiveSession();
      loadExercises();
    }, [])
  );

  const handleStartWorkout = async (routineId: number) => {
    try {
      if (backdateMode) {
         // Start 25 hours ago to hide from homepage (12h rule)
         const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
         await startWorkoutSession(routineId, yesterday.toISOString());
         // Don't disable backdate mode yet? Or do we? Needs to persist if we reload?
         // Actually active session check handles UI from here.
      } else {
         await startWorkoutSession(routineId);
      }
      await loadActiveSession();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEmpty = async () => {
    try {
      const qId = await ensureQuickRoutine();
      if (backdateMode) {
          handleStartWorkout(qId);
      } else {
        await startWorkoutSession(qId);
        await loadActiveSession();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishWorkout = async () => {
    if (!activeSession) return;
    
    Alert.alert('Finish Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
           // If session is old (backlog), ensure we keep the stored start date (or update end date to start + duration?)
           // Ideally end date = start date + 1 hour? Or just use same date?
           // The finishWorkoutSession handles "customEndDate".
           
           const start = new Date(activeSession.session.started_at);
           const now = Date.now();
           if ((now - start.getTime()) > 12 * 60 * 60 * 1000) {
               // Backlog: end at start + 1h default
               const end = new Date(start.getTime() + 60 * 60 * 1000); 
               await finishWorkoutSession(activeSession.session.id, end.toISOString());
           } else {
               await finishWorkoutSession(activeSession.session.id);
           }
           
           setActiveSession(null);
           setEntriesWithSets([]);
           setSelectedEntryId(null);
           setBackdateMode(false); // Reset mode
        },
      },
    ]);
  };
  
  const handleDiscardBacklog = async () => {
      if (!activeSession) return;
      Alert.alert('Discard Log', 'Delete this entry?', [
          { text: 'Cancel', style: 'cancel'},
          { 
              text: 'Delete', 
              style: 'destructive', 
              onPress: async () => {
                  await deleteWorkoutSession(activeSession.session.id);
                  setActiveSession(null);
                  setEntriesWithSets([]);
                  setSelectedEntryId(null);
                  setBackdateMode(false);
              }
          }
      ]);
  };

  const handleToggleDone = async (entryId: number, currentDone: boolean) => {
    await markEntryDone(entryId, !currentDone);
    await loadActiveSession();
  };

  const handleAddExercise = async (exerciseId: number) => {
    if (!activeSession) return;
    await addExerciseToSession(activeSession.session.id, exerciseId);
    setExerciseModalVisible(false);
    await loadActiveSession();
  };

  if (!activeSession) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="text-2xl font-bold text-text mb-2">Start Workout</Text>
          <Text className="text-textDim mb-6">Choose a routine to begin.</Text>

          <Pressable 
             onPress={() => setBackdateMode(!backdateMode)} 
             className={`flex-row items-center justify-center p-3 rounded-xl border mb-6 ${backdateMode ? 'bg-primary/20 border-primary' : 'bg-surface border-gray-700'}`}
          >
            <Ionicons name={backdateMode ? "calendar" : "calendar-outline"} size={20} color={backdateMode ? "#d4fd04" : "#A0A0A0"} />
            <Text className={`ml-2 font-bold ${backdateMode ? 'text-primary' : 'text-textDim'}`}>Log Past Session</Text>
          </Pressable>

          <Pressable
             onPress={handleStartEmpty}
             className="bg-secondary/20 border border-secondary p-4 rounded-xl mb-6 active:bg-secondary/30 flex-row items-center"
           >
             <View className="bg-secondary p-2 rounded-full mr-4">
                <Ionicons name="add" size={24} color="#121212" />
             </View>
             <View>
              <Text className="text-lg font-bold text-secondary">Empty Workout</Text>
              <Text className="text-textDim text-sm">Create a free-form session</Text>
             </View>
           </Pressable>

          <Text className="text-lg font-bold text-text mb-3">Your Routines</Text>
          {routines.filter(r => r.name !== 'Quick Workout').map((routine) => (
            <Pressable
              key={routine.id}
              onPress={() => handleStartWorkout(routine.id)}
              className="bg-surface p-4 rounded-xl mb-3 border border-gray-800 active:bg-gray-800"
            >
              <Text className="text-lg font-bold text-text">{routine.name}</Text>
              <Text className="text-primary mt-1">Tap to begin</Text>
            </Pressable>
          ))}
          {routines.filter(r => r.name !== 'Quick Workout').length === 0 && (
            <Text className="text-textDim text-center mt-4">Create a routine first in Settings &gt; Routines, or use Empty Workout.</Text>
          )}
        </ScrollView>
        {datePickerVisible && (
            <RNDateTimePicker
              value={tempDate}
              mode={datePickerMode}
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
        )}
      </View>
    );
  }

  // Decide if this is a backlog session based on start time (>12h ago) OR if backdateMode is active
  const isBacklog = (activeSession ? (Date.now() - new Date(activeSession.session.started_at).getTime()) > 12 * 60 * 60 * 1000 : false) || backdateMode;

  const selectedEntry = entriesWithSets.find((entry) => entry.entry.id === selectedEntryId);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View style={{flex: 1}}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 150 }}>
        
        {/* Backlog Header Mode */}
        {isBacklog ? (
            <View className="mb-6">
                <Text className="text-2xl font-bold text-secondary mb-1">Log Past Workout</Text>
                <Text className="text-white font-bold text-lg mb-4">{activeSession?.session.routine_name}</Text>
                
                {/* Date Editor */}
                <Pressable 
                    onPress={() => {
                        if (activeSession) {
                            setTempDate(new Date(activeSession.session.started_at));
                        } else {
                            setTempDate(new Date());
                        }
                        setDatePickerMode('date');
                        setDatePickerVisible(true);
                    }}
                    className="flex-row items-center bg-gray-800 p-3 rounded-lg border border-gray-700 mb-4"
                >
                    <Ionicons name="calendar" size={20} color="#d4fd04" />
                    <Text className="text-white ml-3 font-bold text-base">
                        {activeSession ? new Date(activeSession.session.started_at).toLocaleDateString() + ' ' + new Date(activeSession.session.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Select Date'}
                    </Text>
                    <Ionicons name="pencil" size={16} color="#666" style={{marginLeft: 'auto'}} />
                </Pressable>
            </View>
        ) : (
            /* Normal Active App Bar */
            <View className="flex-row justify-between items-center mb-4">
               <View>
                 <Text className="text-2xl font-bold text-text">Active Workout</Text>
                 <Text className="text-base text-primary mb-1">{activeSession?.session.routine_name}</Text>
                 {timer && <Text className="text-2xl font-mono text-white font-bold">{timer}</Text>}
               </View>
               <Pressable onPress={handleFinishWorkout} className="bg-green-500/20 px-4 py-3 rounded-lg border border-green-500/50">
                 <Text className="text-green-400 font-bold">Finish</Text>
               </Pressable>
            </View>
        )}

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
             <Text className="text-lg font-semibold text-text">Exercises</Text>
             <Pressable onPress={() => setExerciseModalVisible(true)} className="flex-row items-center gap-1">
               <Ionicons name="add-circle" size={20} color="#4ade80" />
               <Text className="text-primary font-bold">Add Exercise</Text>
             </Pressable>
          </View>

          {entriesWithSets.map(({ entry }) => {
             const isSelected = selectedEntryId === entry.id;
             return (
              <Pressable
                key={entry.id}
                onPress={() => setSelectedEntryId(entry.id)}
                className={clsx(
                  "p-3 rounded-lg border mb-2 flex-row justify-between items-center",
                  isSelected ? 'bg-primary/10 border-primary' : 'bg-surface border-gray-700'
                )}
              >
                <View className="flex-row items-center gap-3">
                   <Ionicons 
                      name={isSelected ? "radio-button-on" : "radio-button-off"} 
                      size={16} 
                      color={isSelected ? "#4ade80" : "#666"} 
                   />
                   <Text className={clsx("font-semibold text-base", isSelected ? 'text-primary' : 'text-text')}>
                     {entry.exercise_name}
                   </Text>
                </View>
                {entry.is_done ? (
                   <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {selectedEntry && (
          <SetLogger 
             key={selectedEntry.entry.id} // Re-mount on change
             entry={selectedEntry.entry} 
             initialSets={selectedEntry.sets}
             onUpdate={() => loadActiveSession()}
             onSetCompleted={() => {
                 if (!isBacklog) setRestModalVisible(true);
             }}
          />
        )}
      </ScrollView>

      {/* Persistent Footer Buttons for Backlog Mode */}
      {isBacklog && (
          <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-gray-800 flex-row gap-3">
             <Pressable onPress={handleDiscardBacklog} className="flex-1 bg-red-500/10 border border-red-500/50 p-4 rounded-xl items-center justify-center">
                 <Text className="text-red-500 font-bold text-lg">Discard</Text>
             </Pressable>
             <Pressable onPress={handleFinishWorkout} className="flex-1 bg-green-500/10 border border-green-500/50 p-4 rounded-xl items-center justify-center">
                 <Text className="text-green-500 font-bold text-lg">Save Log</Text>
             </Pressable>
          </View>
      )}
      </View>

      {/* Rest Timer Modal */}
      <RestTimerModal 
         visible={restModalVisible} 
         onClose={() => setRestModalVisible(false)}
         initialDuration={restDuration}
      />

      {/* Add Exercise Modal */}
      <Modal visible={exerciseModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface p-6 rounded-t-3xl border-t border-gray-700 h-3/4">
             <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-white">Add Exercise</Text>
                <Pressable onPress={() => setExerciseModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
             </View>
             
             <ScrollView>
               {allExercises.map(ex => (
                 <View
                    key={ex.id}
                    className="bg-background border border-gray-800 rounded-xl mb-2 flex-row overflow-hidden min-h-[60px]"
                 >
                    <Pressable 
                       onPress={() => handleAddExercise(ex.id)}
                       className="flex-1 p-4 justify-center"
                    >
                        <Text className="text-text font-bold text-lg">{ex.name}</Text>
                        <Text className="text-textDim text-sm">{ex.category || 'Other'}</Text>
                    </Pressable>
                    <Pressable 
                       onPress={() => setInfoExercise(ex)}
                       className="w-16 bg-gray-900 border-l border-gray-800 justify-center items-center active:bg-gray-800"
                    >
                       <Ionicons name="information-circle-outline" size={24} color="#4ade80" />
                    </Pressable>
                 </View>
               ))}
               {allExercises.length === 0 && <Text className="text-textDim text-center mt-10">No exercises found.</Text>}
             </ScrollView>
          </View>
          
          <ExerciseInfoOverlay 
            exercise={infoExercise} 
            onClose={() => setInfoExercise(null)} 
          />
        </View>
      </Modal>

      {/* iOS-friendly Date Picker Wrapper */}
      <DateTimePickerModal
          visible={datePickerVisible}
          date={tempDate}
          mode={datePickerMode}
          onChange={onDateChange}
          onConfirm={confirmIOSDate}
          onClose={() => setDatePickerVisible(false)}
      />

      <DateTimePickerModal
          visible={finishDatePickerVisible}
          date={finishDate}
          mode={datePickerMode}
          onChange={onFinishDateChange}
          onConfirm={confirmIOSFinish}
          onClose={() => setFinishDatePickerVisible(false)}
      />

    </View>
  );
}

function DateTimePickerModal({ visible, date, mode, onChange, onConfirm, onClose }: any) {
    if (!visible) return null;

    if (Platform.OS === 'android') {
        return (
            <RNDateTimePicker
                value={date}
                mode={mode}
                is24Hour={true}
                display="default"
                onChange={onChange}
            />
        );
    }

    // iOS Modal Wrapper
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 justify-end bg-black/60">
                <View className="bg-surface pb-8 pt-4 rounded-t-3xl border-t border-gray-700">
                    <View className="flex-row justify-between items-center px-4 mb-4 border-b border-gray-800 pb-4">
                        <Pressable onPress={onClose}>
                            <Text className="text-gray-400 font-medium text-base">Cancel</Text>
                        </Pressable>
                        <Text className="text-white font-bold text-lg">
                            Select {mode === 'datetime' ? 'Time' : (mode === 'date' ? 'Date' : 'Time')}
                        </Text>
                        <Pressable onPress={onConfirm}>
                            <Text className="text-secondary font-bold text-base">Done</Text>
                        </Pressable>
                    </View>
                    <View className="px-4">
                         {/* Centered container for the picker */}
                         <View className="bg-background rounded-xl overflow-hidden">
                            <RNDateTimePicker
                                value={date}
                                mode={mode}
                                is24Hour={true}
                                display="spinner"
                                onChange={onChange}
                                themeVariant="dark" // Force dark theme for iOS
                                textColor="white"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function SetLogger({ 
  entry, 
  initialSets,
  onUpdate,
  onSetCompleted
}: { 
  entry: WorkoutEntry & { exercise_name: string }, 
  initialSets: EntryWithSets['sets'],
  onUpdate: () => void,
  onSetCompleted?: () => void
}) {
  const minRows = 4;
  const displayCount = Math.max(initialSets.length + 1, minRows);
  const [rows, setRows] = useState(() => {
     const res = [];
     for(let i=0; i< displayCount; i++) {
        const existing = initialSets[i];
        if (existing) {
          res.push({ ...existing, unit: existing.unit || 'kg', isSaved: true });
        } else {
          res.push({ id: -Date.now() - i, reps: '', weight: '', unit: 'kg', isSaved: false });
        }
     }
     return res;
  });

  // Sync rows when initialSets changes (e.g. after save/delete)
  useEffect(() => {
    const displayCount = Math.max(initialSets.length + 1, minRows);
    const res = [];
    for(let i=0; i< displayCount; i++) {
        const existing = initialSets[i];
        if (existing) {
          res.push({ ...existing, unit: existing.unit || 'kg', isSaved: true });
        } else {
          // Preserve existing unsaved input if it's the same index? 
          // No, simple reset is safer to avoid ID clashes or stale state.
          // React keys will handle re-mounting.
          res.push({ id: -Date.now() - i, reps: '', weight: '', unit: 'kg', isSaved: false });
        }
    }
    setRows(res);
  }, [initialSets]);

  const handleSaveRow = async (index: number, row: any) => {
    // Basic validation: need at least one value to consider saving (though for new rows we need both)
    if (!row.reps && !row.weight) return; 

    // For new rows, we wait until BOTH reps and weight are filled to avoid "jumping" UI
    // (creating a row with 0 weight, losing focus, etc)
    if (!row.isSaved && (!row.reps || !row.weight)) {
      return; 
    }

    const reps = parseInt(String(row.reps)) || 0;
    const weight = parseFloat(String(row.weight).replace(',','.')) || 0;
    const unit = row.unit || 'kg';

    try {
      if (row.isSaved) {
        await updateSet(row.id, reps, weight, unit);
        // Optimization: Don't trigger full reload on existing row update to preserve focus/UI stability.
        // The local DB is updated, and if we reload later, we'll get the new values.
      } else {
        await addSet(entry.id, reps, weight, unit);
        onUpdate(); // Must reload to get the real ID for the new row
        if (onSetCompleted) onSetCompleted();
      }
      // Note: We don't call onUpdate() for updates anymore to avoid focus loss
    } catch(e) { console.warn(e); }
  };

  const handleDeleteRow = async (index: number, row: any) => {
      if (row.isSaved) {
        await deleteSet(row.id);
        onUpdate();
      } else {
         const newRows = [...rows];
         newRows[index] = { ...newRows[index], reps: '', weight: '' };
         setRows(newRows);
      }
  };

  return (
    <View className="bg-surface p-4 rounded-xl mb-4 border border-gray-800">
       <View className="flex-row justify-between items-center mb-4">
         <Text className="text-xl font-bold text-white">{entry.exercise_name}</Text>
       </View>
       
       <View className="flex-row px-1 mb-2">
          <Text className="w-10 text-center font-bold text-textDim mr-2">Set</Text>
          <Text className="flex-1 text-center font-bold text-textDim mr-2">Reps</Text>
          <Text className="flex-1 text-center font-bold text-textDim mr-2">Weight</Text>
          <Text className="w-16 text-center font-bold text-textDim mr-2">Unit</Text>
          <View className="w-8" /> 
       </View>

       {rows.map((row, index) => {
          return (
             <SetRow 
               key={row.id} 
               index={index} 
               data={row} 
               onSave={(data: any) => handleSaveRow(index, data)}
               onDelete={() => handleDeleteRow(index, row)}
             />
          );
       })}
    </View>
  );
}

function SetRow({ index, data, onSave, onDelete }: any) {
   const [reps, setReps] = useState(data.reps ? String(data.reps) : '');
   const [weight, setWeight] = useState(data.weight ? String(data.weight) : '');
   const [unit, setUnit] = useState(data.unit || 'kg');

   useEffect(() => {
     if (data.isSaved) {
        setReps(String(data.reps));
        setWeight(String(data.weight));
        setUnit(data.unit);
     }
   }, [data.id, data.reps, data.weight, data.unit, data.isSaved]);

   const toggleUnit = () => {
      // Rotate: kg -> lbs -> bw -> kg
      const next = unit === 'kg' ? 'lbs' : (unit === 'lbs' ? 'bw' : 'kg');
      setUnit(next);
      if (reps) onSave({ ...data, reps, weight, unit: next });
   };

   const handleBlur = () => {
      if (reps) {
         onSave({ ...data, reps, weight, unit });
      }
   };

   return (
      <View className={clsx("flex-row items-center mb-2 w-full", data.isSaved ? "bg-background/50 rounded-lg p-1" : "bg-transparent p-1")}>
         <View className="w-10 h-12 items-center justify-center bg-gray-800 rounded mr-2">
            <Text className="font-bold text-white text-base">{index + 1}</Text>
         </View>
         
         <TextInput
            className="flex-1 h-12 bg-background text-white rounded text-center border border-gray-700 mr-2 font-bold text-xl"
            keyboardType="numeric"
            value={reps}
            onChangeText={setReps}
            onBlur={handleBlur}
            placeholder="0"
            placeholderTextColor="#444"
            textAlignVertical="center"
         />

         <TextInput
            className="flex-1 h-12 bg-background text-white rounded text-center border border-gray-700 mr-2 font-bold text-xl"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            onBlur={handleBlur}
            placeholder="-"
            placeholderTextColor="#444"
            textAlignVertical="center"
         />

         <Pressable 
            onPress={toggleUnit}
            className="w-16 h-12 items-center justify-center bg-gray-700 rounded mr-2"
         >
            <Text className="text-sm font-bold text-secondary uppercase">{unit}</Text>
         </Pressable>

         {data.isSaved ? (
           <Pressable onPress={onDelete} className="w-8 h-12 items-center justify-center bg-red-500/20 rounded">
              <Ionicons name="close" size={20} color="#ef4444" />
           </Pressable>
         ) : (
           <View className="w-8" />
         )}
      </View>
   );
}

function RestTimerModal({ visible, onClose, initialDuration }: { visible: boolean, onClose: () => void, initialDuration: number }) {
   const [seconds, setSeconds] = useState(initialDuration);
   const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

   useEffect(() => {
     if (visible) {
         setSeconds(initialDuration);
         const id = setInterval(() => {
             setSeconds(s => {
                 if (s <= 1) {
                     clearInterval(id);
                     // Optional: auto-close or play sound
                     return 0;
                 }
                 return s - 1;
             });
         }, 1000);
         setIntervalId(id);
     } else {
         if (intervalId) clearInterval(intervalId);
     }
     return () => { if (intervalId) clearInterval(intervalId); };
   }, [visible, initialDuration]);

   const addTime = (amount: number) => setSeconds(s => s + amount);

   if (!visible) return null;

   return (
      <Modal visible={visible} transparent animationType="fade">
          <View className="flex-1 bg-black/95 justify-center items-center p-8">
              <Text className="text-textDim text-2xl mb-8 uppercase font-bold tracking-widest">Rest Timer</Text>
              
              <View className="w-64 h-64 rounded-full border-4 border-primary items-center justify-center mb-10 bg-gray-900">
                  <Text className="text-7xl font-bold text-white">
                      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                  </Text>
              </View>

              <View className="flex-row gap-4 mb-10">
                  <Pressable onPress={() => addTime(-10)} className="bg-gray-800 px-6 py-4 rounded-xl border border-gray-700">
                      <Text className="text-white font-bold text-lg">-10s</Text>
                  </Pressable>
                  <Pressable onPress={() => addTime(30)} className="bg-gray-800 px-6 py-4 rounded-xl border border-gray-700">
                      <Text className="text-white font-bold text-lg">+30s</Text>
                  </Pressable>
              </View>

              <Pressable onPress={onClose} className="bg-red-500/20 px-10 py-4 rounded-full border border-red-500/50 items-center">
                  <Text className="text-red-400 font-bold text-xl uppercase tracking-wider">Skip / Close</Text>
              </Pressable>
          </View>
      </Modal>
   );
}

function ExerciseInfoOverlay({ exercise, onClose }: { exercise: Exercise | null, onClose: () => void }) {
    if (!exercise) return null;

    const handleSearch = () => {
        const query = encodeURIComponent(`${exercise.name} exercise form`);
        Linking.openURL(`https://www.google.com/search?q=${query}&tbm=isch`);
    };

    const handleYouTube = () => {
        const query = encodeURIComponent(`${exercise.name} exercise tutorial`);
        Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
    };

    return (
        <View className="absolute inset-0 z-50 bg-black/80 justify-center p-6">
            <View className="bg-surface rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
                    {/* Header */}
                    <View className="bg-gray-800 p-4 flex-row justify-between items-center">
                        <Text className="text-xl font-bold text-white flex-1">{exercise.name}</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close-circle" size={28} color="#666" />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View className="p-6 items-center">
                        <Text className="text-primary font-bold mb-4 uppercase tracking-widest">{exercise.category || 'Uncategorized'}</Text>
                        
                        {exercise.image_url ? (
                            <Image 
                                source={{ uri: exercise.image_url }} 
                                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 20 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="w-full h-48 bg-gray-900 rounded-xl items-center justify-center mb-6 border border-gray-800">
                                <Ionicons name="image-outline" size={48} color="#333" />
                                <Text className="text-textDim mt-2">No image available</Text>
                            </View>
                        )}
                        
                        <Text className="text-textDim text-center mb-6">
                            Not sure how to do this? Check these resources:
                        </Text>

                        <Pressable 
                            onPress={handleSearch}
                            className="w-full bg-blue-500/20 border border-blue-500/50 p-4 rounded-xl flex-row items-center justify-center mb-3"
                        >
                            <Ionicons name="logo-google" size={20} color="#60a5fa" />
                            <Text className="text-blue-400 font-bold ml-2">Search Images</Text>
                        </Pressable>

                        <Pressable 
                            onPress={handleYouTube}
                            className="w-full bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex-row items-center justify-center"
                        >
                            <Ionicons name="logo-youtube" size={20} color="#ef4444" />
                            <Text className="text-red-400 font-bold ml-2">Watch Tutorial</Text>
                        </Pressable>
                    </View>
                </View>
        </View>
    );
}

