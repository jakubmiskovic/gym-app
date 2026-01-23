import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import clsx from 'clsx';

import {
  createReminder,
  deleteReminder,
  listReminders,
  Reminder,
  updateReminder,
} from '../../db/database';
import {
  cancelScheduledNotifications,
  requestNotificationPermissions,
  scheduleReminderNotifications,
} from '../../utils/notifications';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('07:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);

  const loadReminders = async () => {
    const list = await listReminders();
    setReminders(list);
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]
    );
  };

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Reminder title is required.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert('Invalid time', 'Use HH:MM format.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Select days', 'Choose at least one day.');
      return;
    }

    const permissionGranted = await requestNotificationPermissions();
    if (!permissionGranted) {
      Alert.alert('Notifications disabled', 'Enable notifications in system settings.');
      return;
    }
    const notificationIds = await scheduleReminderNotifications(title.trim(), selectedDays, time);
    await createReminder(
      title.trim(),
      selectedDays.join(','),
      time,
      true,
      notificationIds.join(',')
    );
    setTitle('');
    setTime('07:00');
    setSelectedDays(['Mon', 'Wed', 'Fri']);
    await loadReminders();
  };

  const toggleReminderEnabled = async (reminder: Reminder) => {
    const enabled = reminder.enabled === 1;
    if (enabled && reminder.notification_ids) {
      await cancelScheduledNotifications(reminder.notification_ids.split(','));
      await updateReminder(
        reminder.id,
        reminder.title,
        reminder.days_of_week,
        reminder.time,
        false,
        ''
      );
    } else {
      const permissionGranted = await requestNotificationPermissions();
      if (!permissionGranted) {
        Alert.alert('Notifications disabled', 'Enable notifications in system settings.');
        return;
      }
      const daysList = reminder.days_of_week.split(',');
      const notificationIds = await scheduleReminderNotifications(
        reminder.title,
        daysList,
        reminder.time
      );
      await updateReminder(
        reminder.id,
        reminder.title,
        reminder.days_of_week,
        reminder.time,
        true,
        notificationIds.join(',')
      );
    }
    await loadReminders();
  };

  const handleDeleteReminder = async (reminder: Reminder) => {
    if (reminder.notification_ids) {
      await cancelScheduledNotifications(reminder.notification_ids.split(','));
    }
    await deleteReminder(reminder.id);
    await loadReminders();
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-text mb-6">Settings & Reminders</Text>
        
        <View className="bg-surface p-5 rounded-xl border border-gray-800 mb-6">
          <Text className="text-lg font-bold text-white mb-4">New Reminder</Text>
          
          <Text className="text-textDim text-xs mb-1 uppercase">Title</Text>
          <TextInput
            className="bg-background text-white p-3 rounded-lg border border-gray-700 mb-4"
            placeholder="Today is gym day"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />
          
          <Text className="text-textDim text-xs mb-1 uppercase">Time (HH:MM)</Text>
          <TextInput
            className="bg-background text-white p-3 rounded-lg border border-gray-700 mb-4"
            placeholder="HH:MM"
            placeholderTextColor="#666"
            value={time}
            onChangeText={setTime}
          />
          
          <Text className="text-textDim text-xs mb-2 uppercase">Days</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {days.map((day) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                className={clsx(
                  "px-3 py-2 rounded-lg border",
                  selectedDays.includes(day) 
                    ? "bg-primary border-primary" 
                    : "bg-transparent border-gray-600"
                )}
              >
                <Text 
                  className={clsx(
                    "font-bold text-xs",
                    selectedDays.includes(day) ? "text-background" : "text-textDim"
                  )}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
          
          <Pressable 
            className="bg-primary p-3 rounded-lg items-center active:opacity-90"
            onPress={handleSaveReminder}
          >
            <Text className="text-background font-bold text-base">Save Reminder</Text>
          </Pressable>
        </View>

        <Text className="text-xl font-bold text-text mb-3">Saved Reminders</Text>
        {reminders.map((reminder) => (
          <View key={reminder.id} className="bg-surface p-4 rounded-xl mb-3 border border-gray-800">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-lg font-bold text-white">{reminder.title}</Text>
                <Text className="text-primary text-sm mt-1">
                  {reminder.time} <Text className="text-textDim">• {reminder.days_of_week}</Text>
                </Text>
              </View>
              <View className={clsx(
                "w-3 h-3 rounded-full mt-2",
                reminder.enabled === 1 ? "bg-green-500" : "bg-gray-600"
              )} />
            </View>
            
            <View className="flex-row gap-3 mt-3 justify-end">
              <Pressable
                className={clsx(
                  "px-4 py-2 rounded-lg",
                  reminder.enabled === 1 ? "bg-gray-700" : "bg-primary"
                )}
                onPress={() => toggleReminderEnabled(reminder)}
              >
                <Text className={clsx(
                  "font-bold text-xs",
                  reminder.enabled === 1 ? "text-white" : "text-background"
                )}>
                  {reminder.enabled === 1 ? 'Disable' : 'Enable'}
                </Text>
              </Pressable>
              <Pressable 
                className="bg-red-500/20 px-4 py-2 rounded-lg border border-red-500/50" 
                onPress={() => handleDeleteReminder(reminder)}
              >
                <Text className="text-red-400 font-bold text-xs">Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
        
        {reminders.length === 0 && (
          <Text className="text-textDim text-center italic mt-4">No reminders yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

