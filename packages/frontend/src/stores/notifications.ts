import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/api';

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<any[]>([]);
  const loading = ref(false);
  const socket = ref<any>(null);

  const unreadCount = computed(() => items.value.filter(n => !n.isRead).length);

  async function fetchNotifications(page = 1) {
    loading.value = true;
    try {
      const res: any = await api.get('/notifications', { params: { page, limit: 20 } });
      items.value = res.items || [];
    } finally { loading.value = false; }
  }

  function connectWebSocket(userId: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3000/ws/notifications?userId=${userId}`;
    try {
      socket.value = new WebSocket(wsUrl);
      socket.value.onmessage = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification:new') {
            items.value.unshift(data.payload);
          }
        } catch { /* ignore parse errors */ }
      };
    } catch { console.warn('WebSocket connection failed'); }
  }

  async function markAsRead(id: string) {
    await api.patch('/notifications/' + id + '/read');
    const item = items.value.find(n => n.id === id);
    if (item) item.isRead = true;
  }

  async function markAllAsRead() {
    await api.patch('/notifications/read-all');
    items.value.forEach(n => n.isRead = true);
  }

  return { items, loading, unreadCount, fetchNotifications, connectWebSocket, markAsRead, markAllAsRead };
});
