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
  createReminder,
  deleteReminder,
  listReminders,
  Reminder,
  updateReminder,
} from '../db/database';
import {
  cancelScheduledNotifications,
  requestNotificationPermissions,
  scheduleReminderNotifications,
} from '../utils/notifications';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsScreen() {
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings & Reminders</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>New Reminder</Text>
        <TextInput
          style={styles.input}
          placeholder="Today is gym day"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={time}
          onChangeText={setTime}
        />
        <Text style={styles.label}>Days</Text>
        <View style={styles.dayRow}>
          {days.map((day) => (
            <Pressable
              key={day}
              onPress={() => toggleDay(day)}
              style={[styles.dayChip, selectedDays.includes(day) && styles.dayChipActive]}
            >
              <Text style={styles.dayText}>{day}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={handleSaveReminder}>
          <Text style={styles.primaryButtonText}>Save Reminder</Text>
        </Pressable>
      </View>

      {reminders.map((reminder) => (
        <View key={reminder.id} style={styles.reminderCard}>
          <Text style={styles.cardTitle}>{reminder.title}</Text>
          <Text style={styles.cardSub}>
            {reminder.days_of_week} @ {reminder.time}
          </Text>
          <View style={styles.rowButtons}>
            <Pressable
              style={[styles.smallButton, reminder.enabled === 1 ? styles.enabled : styles.disabled]}
              onPress={() => toggleReminderEnabled(reminder)}
            >
              <Text style={styles.smallButtonText}>
                {reminder.enabled === 1 ? 'Disable' : 'Enable'}
              </Text>
            </Pressable>
            <Pressable style={styles.destructiveButton} onPress={() => handleDeleteReminder(reminder)}>
              <Text style={styles.smallButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {reminders.length === 0 ? (
        <Text style={styles.emptyText}>No reminders yet.</Text>
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#555',
    marginBottom: 6,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  dayChipActive: {
    backgroundColor: '#dff4ff',
    borderColor: '#2d6cdf',
  },
  dayText: {
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#2d6cdf',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  reminderCard: {
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
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  enabled: {
    backgroundColor: '#2d6cdf',
  },
  disabled: {
    backgroundColor: '#999',
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
  emptyText: {
    marginTop: 20,
    color: '#777',
  },
});
