import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export const useEventStore = defineStore('events', () => {
  const events = ref<any[]>([]);
  const loading = ref(false);

  async function fetchEvents(startDate?: string, endDate?: string) {
    loading.value = true;
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res: any = await api.get('/events', { params });
      events.value = res;
    } finally {
      loading.value = false;
    }
  }

  async function createEvent(data: any) {
    const res: any = await api.post('/events', data);
    events.value.push(res);
    return res;
  }

  async function updateEvent(id: string, data: any) {
    const res: any = await api.patch('/events/' + id, data);
    const idx = events.value.findIndex(e => e.id === id);
    if (idx >= 0) events.value[idx] = res;
    return res;
  }

  async function deleteEvent(id: string) {
    await api.delete('/events/' + id);
    events.value = events.value.filter(e => e.id !== id);
  }

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent };
});
