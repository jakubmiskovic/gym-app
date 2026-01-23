import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsMenuScreen from './SettingsMenuScreen';
import NotificationsSettingsScreen from './NotificationsSettingsScreen';
import ExercisesSettingsScreen from './ExercisesSettingsScreen';
import RoutinesSettingsScreen from './RoutinesSettingsScreen';
import CategoriesSettingsScreen from './CategoriesSettingsScreen';

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#121212' }
      }}
    >
      <Stack.Screen name="Menu" component={SettingsMenuScreen} />
      <Stack.Screen name="Notifications" component={NotificationsSettingsScreen} />
      <Stack.Screen name="Categories" component={CategoriesSettingsScreen} />
      <Stack.Screen name="Exercises" component={ExercisesSettingsScreen} />
      <Stack.Screen name="Routines" component={RoutinesSettingsScreen} />
    </Stack.Navigator>
  );
}
