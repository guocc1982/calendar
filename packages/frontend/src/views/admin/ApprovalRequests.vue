<template>
  <div class="admin-page">
    <div class="page-header">
      <h3>审批请求</h3>
    </div>
    <n-empty v-if="pendingRequests.length === 0" description="暂无待审批的日程" />
    <n-list v-else>
      <n-list-item v-for="req in pendingRequests" :key="req.id">
        <n-thing :title="req.summary" :description="req.description || ''">
          <template #header-extra>
            <n-tag type="warning">待审批</n-tag>
          </template>
          <template #description>
            <p>发起人: {{ req.user?.name }} ({{ req.user?.email }})</p>
            <p>时间: {{ formatTime(req.startTime) }} - {{ formatTime(req.endTime) }}</p>
            <p>类型: {{ eventTypeLabel(req.eventType) }}</p>
          </template>
          <template #action>
            <n-space>
              <n-button type="primary" size="small" @click="handleApprove(req.id)">通过</n-button>
              <n-button type="error" size="small" ghost @click="handleReject(req)">驳回</n-button>
            </n-space>
          </template>
        </n-thing>
      </n-list-item>
    </n-list>

    <!-- Reject dialog -->
    <n-modal v-model:show="showRejectModal" preset="dialog" title="驳回理由" positive-text="确认驳回" negative-text="取消" @positive-click="confirmReject" @negative-click="showRejectModal = false">
      <n-input v-model:value="rejectReason" type="textarea" placeholder="请输入驳回原因（可选）" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/utils/api';
import { format, parseISO } from 'date-fns';

const message = useMessage();
const pendingRequests = ref<any[]>([]);
const showRejectModal = ref(false);
const rejectReason = ref('');
const rejectTarget = ref('');

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'M月d日 HH:mm');
}

function eventTypeLabel(type: string) {
  const map: any = { MEETING: '会议', TRAVEL: '差旅', PERSONAL: '个人', TASK: '任务' };
  return map[type] || type;
}

async function fetchPending() {
  try {
    const res: any = await api.get('/approvals/pending');
    pendingRequests.value = res;
  } catch { message.error('获取审批列表失败'); }
}

async function handleApprove(id: string) {
  try {
    await api.post('/approvals/' + id + '/approve');
    message.success('已通过');
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== id);
  } catch { message.error('操作失败'); }
}

function handleReject(req: any) {
  rejectTarget.value = req.id;
  rejectReason.value = '';
  showRejectModal.value = true;
}

async function confirmReject() {
  try {
    await api.post('/approvals/' + rejectTarget.value + '/reject', { reason: rejectReason.value || undefined });
    message.success('已驳回');
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== rejectTarget.value);
    showRejectModal.value = false;
  } catch { message.error('操作失败'); }
}

onMounted(fetchPending);
</script>

<style scoped>
.admin-page { padding: 24px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { font-size: 20px; }
</style>
