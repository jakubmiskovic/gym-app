import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type SettingsStackParamList = {
  Menu: undefined;
  Notifications: undefined;
  Exercises: undefined;
  Routines: undefined;
  Categories: undefined;
};

export default function SettingsMenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const menuItems = [
    { title: 'Notifications', icon: 'notifications', route: 'Notifications' as const, desc: 'Manage workout reminders' },
    { title: 'Categories', icon: 'pricetags', route: 'Categories' as const, desc: 'Manage exercise categories' },
    { title: 'Exercises', icon: 'barbell', route: 'Exercises' as const, desc: 'Add, edit, or remove exercises' },
    { title: 'Routines', icon: 'list', route: 'Routines' as const, desc: 'Manage your workout plans' },
  ];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-4 border-b border-gray-800">
        <Text className="text-2xl font-bold text-text">Settings</Text>
      </View>
      
      <ScrollView className="p-4">
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => navigation.navigate(item.route)}
            className="flex-row items-center bg-surface p-4 rounded-xl mb-3 border border-gray-800 active:bg-gray-800"
          >
            <View className="bg-gray-800 p-3 rounded-full mr-4">
              <Ionicons name={item.icon as any} size={24} color="#4ade80" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">{item.title}</Text>
              <Text className="text-sm text-textDim">{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
