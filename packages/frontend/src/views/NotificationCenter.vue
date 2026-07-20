<template>
  <div class="notif-page">
    <div class="page-header">
      <h3>消息中心</h3>
      <n-button v-if="unreadCount > 0" size="small" @click="store.markAllAsRead()">全部已读</n-button>
    </div>
    <n-tabs default-value="unread">
      <n-tab-pane name="unread" :tab="`未读 (${unreadCount})`">
        <n-empty v-if="unreadItems.length === 0" description="暂无未读消息" />
        <n-list v-else>
          <n-list-item v-for="item in unreadItems" :key="item.id" @click="handleClick(item)">
            <template #prefix>
              <n-badge dot :type="item.type === 'event_invite' ? 'info' : 'warning'" />
            </template>
            <n-thing :title="item.title" :description="item.content">
              <template #footer>{{ item.createdAt }}</template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-tab-pane>
      <n-tab-pane name="all" tab="全部">
        <n-empty v-if="store.items.length === 0" description="暂无消息" />
        <n-list v-else>
          <n-list-item v-for="item in store.items" :key="item.id" @click="handleClick(item)">
            <n-thing :title="item.title" :description="item.content" :class="{ unread: !item.isRead }">
              <template #footer>{{ item.createdAt }}</template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';

const store = useNotificationStore();
const router = useRouter();

const unreadItems = computed(() => store.items.filter(n => !n.isRead));
const unreadCount = computed(() => store.unreadCount);

function handleClick(item: any) {
  if (!item.isRead) store.markAsRead(item.id);
  if (item.relatedEventId) router.push('/?event=' + item.relatedEventId);
}

onMounted(() => { store.fetchNotifications(); });
</script>

<style scoped>
.notif-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { font-size: 20px; }
.unread { font-weight: 500; }
:deep(.n-thing) { cursor: pointer; }
</style>

