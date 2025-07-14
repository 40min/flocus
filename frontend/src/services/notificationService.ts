export const requestPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return 'denied';
  }
  return Notification.requestPermission();
};

interface NotificationOptions {
  body?: string;
  icon?: string;
}

export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      ...options,
      icon: options?.icon || '/logo192.png', // Default icon
    });
  }
};
