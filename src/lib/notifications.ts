import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SYj2rN7nQ1WVXhFhGQxGvCnqf5wSv9bVSqC4Q0J9EBHZYnTk0tP7EXE';

function isIOSSafari() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|Chrome/.test(ua);
  return iOS && webkit && notChrome;
}

function isSafari() {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (isIOSSafari()) {
    throw new Error('iOS Safari does not support push notifications. Please use a different browser or device.');
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported');
  }

  if (isIOSSafari()) {
    throw new Error('iOS Safari does not support push notifications. Please use a different browser or device.');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    await navigator.serviceWorker.ready;

    await registration.update();

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const subscriptionData = subscription.toJSON();

    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscriptionData.endpoint!,
      p256dh: subscriptionData.keys!.p256dh,
      auth: subscriptionData.keys!.auth
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    if (isSafari()) {
      throw new Error('Safari requires macOS 13 or later for push notifications. Please check your system version or try a different browser.');
    }
    throw error;
  }
}

export async function unsubscribeFromPushNotifications() {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();

  const subscriptionData = subscription.toJSON();
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscriptionData.endpoint!);
}

export async function checkNotificationStatus() {
  if (isIOSSafari()) {
    return { supported: false, permission: 'denied' as NotificationPermission, subscribed: false };
  }

  if (!('Notification' in window)) {
    return { supported: false, permission: 'denied' as NotificationPermission, subscribed: false };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, permission: 'denied' as NotificationPermission, subscribed: false };
  }

  const permission = Notification.permission;
  let subscribed = false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      subscribed = !!subscription;
    }
  } catch (error) {
    console.error('Error checking notification status:', error);
  }

  return { supported: true, permission, subscribed };
}

export function playNotificationSound() {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKbh8LhjHQU2kdvyyHYpBSl+zPLaizsKFlW16+ypWRMJQZze8sJqHwUu');
  audio.play().catch(() => {});
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
