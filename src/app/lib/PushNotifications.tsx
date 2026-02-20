import React, { createContext, useContext, useEffect, useState } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface PushNotificationsContextType {
  token: string | null;
  notifications: PushNotificationSchema[];
  requestPermissions: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsContextType | undefined>(undefined);

export const PushNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return;
    }

    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
      } else {
        toast.error('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // On registration, save the token
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      setToken(token.value);
      // Here you would typically send the token to your backend/Supabase
      // toast.success('Device registered for notifications');
    });

    // Some error occurred
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
      toast.error('Failed to register for push notifications');
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push received: ' + JSON.stringify(notification));
      setNotifications(prev => [...prev, notification]);
      toast(notification.title || 'New Notification', {
        description: notification.body,
      });
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // Handle navigation or specific actions here
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return (
    <PushNotificationsContext.Provider value={{ token, notifications, requestPermissions }}>
      {children}
    </PushNotificationsContext.Provider>
  );
};

export const usePushNotifications = () => {
  const context = useContext(PushNotificationsContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationsProvider');
  }
  return context;
};
