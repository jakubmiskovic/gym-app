import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
    return true;
  }
  const response = await Notifications.requestPermissionsAsync();
  return response.granted;
};

const dayMap: Record<string, number> = {
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
  Sun: 1,
};

export const scheduleReminderNotifications = async (
  title: string,
  days: string[],
  time: string
) => {
  const [hourString, minuteString] = time.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);
  const ids: string[] = [];

  for (const day of days) {
    const weekday = dayMap[day];
    if (!weekday) {
      continue;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: title,
      },
      trigger: {
        weekday,
        hour,
        minute,
        repeats: true,
      },
    });
    ids.push(id);
  }

  return ids;
};

export const cancelScheduledNotifications = async (ids: string[]) => {
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
};
