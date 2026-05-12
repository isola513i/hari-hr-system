import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'subscribed' : 'unsubscribed');
    }).catch(() => setState('unsubscribed'));
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    setState('loading');
    try {
      const { publicKey } = await api.get<{ publicKey: string }>('/notifications/push-key');
      if (!publicKey) { setState('unsupported'); return false; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return false; }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post('/notifications/push-subscribe', subscription.toJSON() as Record<string, unknown>);
      setState('subscribed');
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      setState('unsubscribed');
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/notifications/push-unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState('unsubscribed');
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setState('subscribed');
      return false;
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
