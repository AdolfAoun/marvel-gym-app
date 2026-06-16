import { appNotifications } from '../mock';
import type { AppNotification } from '../types';

export const getNotifications = async (): Promise<AppNotification[]> => {
  return [...appNotifications];
};

export const markNotificationAsRead = async (
  notificationId: string,
): Promise<AppNotification | undefined> => {
  const notification = appNotifications.find(
    (item) => item.id === notificationId,
  );

  if (!notification) {
    return undefined;
  }

  return {
    ...notification,
    isRead: true,
  };
};

export const notificationService = {
  getNotifications,
  markNotificationAsRead,
};
