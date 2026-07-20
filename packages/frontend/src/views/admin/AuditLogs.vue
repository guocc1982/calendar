<template>
  <div class="admin-page">
    <div class="page-header">
      <h3>审计日志</h3>
    </div>
    <n-data-table
      :columns="columns"
      :data="logs"
      :loading="loading"
      :pagination="pagination"
      @update:page="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue';
import { NTag, NSpace } from 'naive-ui';
import api from '@/utils/api';

const logs = ref<any[]>([]);
const loading = ref(false);
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 });

const columns = [
  { title: '时间', key: 'createdAt', width: 180 },
  { title: '应用 ID', key: 'appId', width: 200 },
  { title: '事件类型', key: 'eventType', width: 150 },
  {
    title: '结果',
    key: 'result',
    width: 100,
    render: (row: any) => h(NTag, { type: row.result === 'success' ? 'success' : 'error' }, () => row.result),
  },
  { title: '请求摘要', key: 'requestSummary', ellipsis: { tooltip: true } },
  { title: 'IP 地址', key: 'ipAddress', width: 140 },
];

async function fetchLogs() {
  loading.value = true;
  try {
    const res: any = await api.get('/admin/third-party/audit-logs', {
      params: { page: pagination.value.page, limit: pagination.value.pageSize },
    });
    logs.value = res.items;
    pagination.value.itemCount = res.total;
  } finally { loading.value = false; }
}

function handlePageChange(page: number) {
  pagination.value.page = page;
  fetchLogs();
}

onMounted(fetchLogs);
</script>

<style scoped>
.admin-page { padding: 24px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { font-size: 20px; }
</style>
