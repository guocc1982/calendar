<template>
  <div class="app-layout">
    <!-- PC Sidebar -->
    <aside v-if="!isMobile" class="sidebar">
      <div class="sidebar-header">
        <h2>日程管理</h2>
      </div>
      <nav class="sidebar-nav">
        <n-menu :options="menuOptions" @update:value="handleMenuSelect" />
      </nav>
      <div class="sidebar-footer">
        <n-button @click="handleLogout" quaternary size="small">退出登录</n-button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Mobile Bottom Nav -->
    <nav v-if="isMobile" class="mobile-nav">
      <div class="mobile-nav-item" @click="handleMenuSelect('dashboard')">
        <span>日程</span>
      </div>
      <div class="mobile-nav-item mobile-nav-voice" @click="handleVoiceInput">
        <span>语音+</span>
      </div>
      <div class="mobile-nav-item" @click="handleLogout">
        <span>我的</span>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { useMessage, NIcon } from 'naive-ui';

const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const message = useMessage();
const notifStore = useNotificationStore();

const isMobile = computed(() => themeStore.isMobile);

const menuOptions = [
  { label: () => h('span', null, { default: () => '我的日程' }), key: 'dashboard' },
  { label: () => h('span', null, { default: () => '团队日历' }), key: 'team' },
  { label: () => h('span', null, { default: () => '周报' }), key: 'reports' },
  { type: 'divider' as const },
  { label: () => h('span', null, { default: () => '消息中心' }), key: 'notifications' },
  { label: () => h('span', null, { default: () => '第三方集成' }), key: 'admin-third-party' },
  { label: () => h('span', null, { default: () => '审计日志' }), key: 'admin-audit-logs' },
  { label: () => h('span', null, { default: () => '审批' }), key: 'admin-approvals' },
  { label: () => h('span', null, { default: () => '租户设置' }), key: 'admin-settings' },
];
  { label: () => h('span', null, { default: () => '我的日程' }), key: 'dashboard' },
  { label: () => h('span', null, { default: () => '团队日历' }), key: 'team' },
  { label: () => h('span', null, { default: () => '周报' }), key: 'reports' },
];

function handleMenuSelect(key: string) {
  if (key === 'dashboard') router.push('/');
}

function handleVoiceInput() {
  router.push('/'); message.info('点击右下角语音按钮开始');
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-layout { display: flex; height: 100vh; }
.sidebar { width: 240px; background: #f5f7fa; border-right: 1px solid #e8eaed; display: flex; flex-direction: column; }
.sidebar-header { padding: 20px 16px; border-bottom: 1px solid #e8eaed; }
.sidebar-header h2 { font-size: 18px; font-weight: 600; }
.sidebar-nav { flex: 1; padding: 8px; }
.sidebar-footer { padding: 16px; border-top: 1px solid #e8eaed; }
.main-content { flex: 1; overflow-y: auto; background: #fff; }

.mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 56px; background: #fff; border-top: 1px solid #e8eaed; display: flex; align-items: center; justify-content: space-around; z-index: 100; }
.mobile-nav-item { flex: 1; text-align: center; font-size: 12px; color: #666; cursor: pointer; }
.mobile-nav-voice { background: #667eea; color: #fff; border-radius: 50%; width: 48px; height: 48px; line-height: 48px; margin-top: -16px; font-size: 14px; font-weight: bold; }
@media (max-width: 768px) {
  .app-layout { padding-bottom: 56px; }
}
</style>






