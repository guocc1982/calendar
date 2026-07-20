<template>
  <div class="admin-page">
    <div class="page-header">
      <h3>第三方应用管理</h3>
      <n-button type="primary" @click="showCreateModal = true">+ 注册应用</n-button>
    </div>

    <n-data-table :columns="columns" :data="apps" :loading="loading" :pagination="{ pageSize: 10 }" />

    <!-- Register App Modal -->
    <n-modal v-model:show="showCreateModal" preset="card" title="注册新应用" style="max-width: 480px;">
      <n-form>
        <n-form-item label="应用名称">
          <n-input v-model:value="form.appName" placeholder="例如：会议系统" />
        </n-form-item>
        <n-form-item label="IP 白名单（可选）">
          <n-dynamic-tags v-model:value="form.ipWhitelist" />
        </n-form-item>
        <n-form-item label="允许的事件类型">
          <n-select v-model:value="form.allowedEventTypes" multiple :options="eventTypeOptions" />
        </n-form-item>
        <n-form-item label="速率限制（次/分钟）">
          <n-input-number v-model:value="form.rateLimit" :min="1" :max="10000" />
        </n-form-item>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleRegister" :loading="creating">注册</n-button>
        </div>
      </n-form>
    </n-modal>

    <!-- App Detail Drawer -->
    <n-drawer v-model:show="showDetail" :width="360">
      <n-drawer-content :title="selectedApp?.appName" closable>
        <n-descriptions label-placement="left" column={1}>
          <n-descriptions-item label="状态">{{ selectedApp?.status }}</n-descriptions-item>
          <n-descriptions-item label="速率限制">{{ selectedApp?.rateLimit }}/分钟</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ selectedApp?.createdAt }}</n-descriptions-item>
        </n-descriptions>
        <div v-if="selectedApp?.apiKey" style="margin-top: 16px;">
          <p><strong>API Key（只显示一次）：</strong></p>
          <n-input-group>
            <n-input :value="selectedApp.apiKey" readonly type="textarea" :rows="2" />
            <n-button @click="copyKey(selectedApp.apiKey)">复制</n-button>
          </n-input-group>
        </div>
        <n-button type="error" ghost style="margin-top: 16px;" @click="handleRevoke">撤销应用</n-button>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { useMessage, NButton, NSpace, NTag } from 'naive-ui';
import api from '@/utils/api';

const message = useMessage();
const apps = ref<any[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showDetail = ref(false);
const selectedApp = ref<any>(null);
const creating = ref(false);

const form = ref({
  appName: '',
  ipWhitelist: [] as string[],
  allowedEventTypes: [] as string[],
  rateLimit: 100,
});

const eventTypeOptions = [
  { label: '会议', value: 'MEETING' },
  { label: '差旅', value: 'TRAVEL' },
  { label: '个人', value: 'PERSONAL' },
  { label: '任务', value: 'TASK' },
];

const columns = [
  { title: '应用名称', key: 'appName' },
  { title: '状态', key: 'status', render: (row: any) => h(NTag, { type: row.status === 'active' ? 'success' : 'error' }, () => row.status) },
  { title: '速率限制', key: 'rateLimit' },
  { title: '创建时间', key: 'createdAt' },
  {
    title: '操作',
    key: 'actions',
    render: (row: any) => h(NSpace, null, [
      h(NButton, { size: 'small', onClick: () => viewApp(row) }, () => '查看'),
      h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => revokeApp(row.id) }, () => '撤销'),
    ]),
  },
];

async function fetchApps() {
  loading.value = true;
  try {
    const res: any = await api.get('/admin/third-party/apps');
    apps.value = res;
  } finally { loading.value = false; }
}

async function handleRegister() {
  if (!form.value.appName) { message.warning('请输入应用名称'); return; }
  creating.value = true;
  try {
    const res: any = await api.post('/admin/third-party/apps', form.value);
    message.success('注册成功');
    selectedApp.value = { ...res, apiKey: res.apiKey };
    showDetail.value = true;
    showCreateModal.value = false;
    await fetchApps();
  } catch { message.error('注册失败'); }
  finally { creating.value = false; }
}

function viewApp(app: any) {
  selectedApp.value = app;
  showDetail.value = true;
}

async function revokeApp(id: string) {
  try {
    await api.post('/admin/third-party/apps/' + id + '/revoke');
    message.success('已撤销');
    await fetchApps();
  } catch { message.error('撤销失败'); }
}

function handleRevoke() {
  if (selectedApp.value) revokeApp(selectedApp.value.id);
}

function copyKey(key: string) {
  navigator.clipboard.writeText(key).then(() => message.success('已复制'));
}

onMounted(fetchApps);
</script>

<style scoped>
.admin-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { font-size: 20px; }
</style>


