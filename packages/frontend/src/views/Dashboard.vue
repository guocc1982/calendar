<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="view-toggle">
        <n-button-group>
          <n-button :type="viewMode === 'day' ? 'primary' : 'default'" size="small" @click="viewMode = 'day'">日</n-button>
          <n-button :type="viewMode === 'week' ? 'primary' : 'default'" size="small" @click="viewMode = 'week'">周</n-button>
          <n-button :type="viewMode === 'month' ? 'primary' : 'default'" size="small" @click="viewMode = 'month'">月</n-button>
        </n-button-group>
      </div>
      <h3 class="current-date">{{ currentDateTitle }}</h3>
      <div class="header-actions">
        <n-button size="small" @click="prevPeriod">&lt;</n-button>
        <n-button size="small" @click="goToday">今天</n-button>
        <n-button size="small" @click="nextPeriod">&gt;</n-button>
        <n-button type="primary" size="small" @click="showCreateModal = true">+ 新建</n-button>
      </div>
    </div>

    <div class="dashboard-body">
      <div class="calendar-section">
        <div v-if="viewMode === 'month'" class="month-grid">
          <div class="weekday-header">
            <div v-for="d in weekDays" :key="d" class="weekday-cell">{{ d }}</div>
          </div>
          <div class="month-grid-body">
            <div v-for="(day, idx) in monthDays" :key="idx"
              :class="['day-cell', { 'day-today': day.isToday, 'day-other': !day.isCurrentMonth }]"
              @click="selectDate(day.date)">
              <span class="day-number">{{ day.dayNumber }}</span>
              <div class="day-events">
                <div v-for="event in getEventsForDay(day.date)" :key="event.id"
                  :class="['day-event-dot', 'event-' + event.eventType.toLowerCase()]"></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="day-week-view">
          <div v-for="(day, idx) in weekDaysList" :key="idx" :class="['day-column', { 'day-column-selected': isSelected(day.date) }]" @click="selectDate(day.date)" @dragover.prevent @drop="onDropWeek($event, day.date)">
            <div class="day-column-header">
              <span class="day-name">{{ day.label }}</span>
              <span class="day-num">{{ day.dayNumber }}</span>
            </div>
            <div class="day-column-events">
              <div v-for="event in getEventsForDay(day.date)" :key="event.id"
                :class="['event-card', 'event-' + event.eventType.toLowerCase()]" @click.stop="viewEvent(event)">
                <span class="event-time">{{ formatTime(event.startTime) }}</span>
                <span class="event-title">{{ event.summary }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="event-list-section">
        <h4>日程列表</h4>
        <div v-if="selectedDateEvents.length === 0" class="empty-state">该日无日程</div>
        <div v-for="event in selectedDateEvents" :key="event.id" class="event-list-item" @click="viewEvent(event)">
          <div :class="['event-type-badge', 'badge-' + (event.eventType || 'personal').toLowerCase()]"></div>
          <div class="event-list-content">
            <div class="event-list-title">{{ event.summary }}</div>
            <div class="event-list-time">{{ formatTime(event.startTime) }} - {{ formatTime(event.endTime) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Event Modal -->
    <n-modal v-model:show="showCreateModal" preset="card" title="新建日程" style="max-width: 520px;">
      <n-form>
        <n-form-item label="标题">
          <n-input v-model:value="newEvent.summary" placeholder="日程标题" />
        </n-form-item>
        <div style="display: flex; gap: 8px;">
          <n-form-item label="开始时间" style="flex: 1;">
            <n-date-picker v-model:value="newEvent.startTime" type="datetime" />
          </n-form-item>
          <n-form-item label="结束时间" style="flex: 1;">
            <n-date-picker v-model:value="newEvent.endTime" type="datetime" />
          </n-form-item>
        </div>
        <n-form-item label="类型">
          <n-select v-model:value="newEvent.eventType" :options="eventTypeOptions" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="newEvent.description" type="textarea" rows="3" />
        </n-form-item>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreateEvent" :loading="creating">创建</n-button>
        </div>
      </n-form>
    </n-modal>

    <!-- AI Voice Parse Result Modal -->
    <n-modal v-model:show="showAIResult" preset="card" title="语音解析结果" style="max-width: 480px;">
      <div v-if="aiParsedEvent">
        <p><strong>标题：</strong>{{ aiParsedEvent.summary || '' }}</p>
        <p><strong>类型：</strong>{{ eventTypeLabel(aiParsedEvent.eventType) || '' }}</p>
        <p><strong>开始：</strong>{{ aiParsedEvent.startTime ? format(parseISO(aiParsedEvent.startTime), 'M月d日 HH:mm') : '未解析' }}</p>
        <p><strong>结束：</strong>{{ aiParsedEvent.endTime ? format(parseISO(aiParsedEvent.endTime), 'M月d日 HH:mm') : '未解析' }}</p>
        <p v-if="aiParsedEvent.location"><strong>地点：</strong>{{ aiParsedEvent.location.name }}</p>
        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
          <n-button @click="showAIResult = false">取消</n-button>
          <n-button type="primary" @click="confirmAIEvent">确认创建</n-button>
        </div>
      </div>
    </n-modal>

    <!-- View Event Detail Drawer -->
    <n-drawer v-model:show="showDetail" :width="320" :placement="isMobile ? 'bottom' : 'right'">
      <n-drawer-content :title="selectedEvent?.summary" closable>
        <div v-if="selectedEvent" class="event-detail">
          <p><strong>时间：</strong>{{ formatTime(selectedEvent.startTime) }} - {{ formatTime(selectedEvent.endTime) }}</p>
          <p v-if="selectedEvent.description"><strong>描述：</strong>{{ selectedEvent.description }}</p>
          <p v-if="selectedEvent.eventType"><strong>类型：</strong>{{ eventTypeLabel(selectedEvent.eventType) }}</p>
          <div style="margin-top: 16px; display: flex; gap: 8px;">
            <n-button size="small" @click="handleEditEvent">编辑</n-button>
            <n-button size="small" @click="showAttachmentUpload = true; loadAttachments(selectedEvent.id)">附件</n-button>
            <n-button size="small" type="primary" ghost @click="showShareModal = true">分享</n-button>
            <n-button size="small" type="error" @click="handleDeleteEvent">删除</n-button>
          </div>
        </div>
    
    
    <!-- Attachment Modal -->
    <n-modal v-model:show="showAttachmentUpload" preset="card" title="管理附件" style="max-width: 480px;">
      <div style="margin-bottom: 16px;">
        <n-upload :custom-request="handleUpload" :show-file-list="false" accept="*">
          <n-button :loading="uploading">上传文件</n-button>
        </n-upload>
      </div>
      <n-empty v-if="attachments.length === 0" description="暂无附件" />
      <n-list v-else>
        <n-list-item v-for="att in attachments" :key="att.id">
          <n-thing :title="att.fileName" :description="formatFileSize(att.fileSize)">
            <template #action>
              <n-button size="tiny" @click="window.open('/api/v1/attachments/' + att.id, '_blank')">下载</n-button>
              <n-button size="tiny" type="error" ghost @click="deleteAttachment(att.id)">删除</n-button>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
      <n-button @click="showAttachmentUpload = false" style="margin-top: 12px;">关闭</n-button>
    </n-modal>
<!-- Share Modal -->
    <n-modal v-model:show="showShareModal" preset="card" title="分享日程" style="max-width: 420px;">
      <n-form label-placement="top">
        <n-form-item label="密码保护（可选）">
          <n-input v-model:value="sharePassword" type="password" placeholder="设置查看密码" />
        </n-form-item>
        <n-form-item label="有效期">
          <n-radio-group v-model:value="shareExpiry">
            <n-space>
              <n-radio value="1">1 天</n-radio>
              <n-radio value="7">7 天</n-radio>
              <n-radio value="30">30 天</n-radio>
              <n-radio value="0">永久</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <div v-if="shareUrl" style="margin-bottom: 12px;">
          <p style="margin-bottom: 4px;"><strong>分享链接：</strong></p>
          <n-input-group>
            <n-input :value="shareUrl" readonly />
            <n-button @click="copyShareUrl">复制</n-button>
          </n-input-group>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <n-button @click="showShareModal = false">关闭</n-button>
          <n-button v-if="!shareUrl" type="primary" @click="generateShare" :loading="generatingShare">生成链接</n-button>
          <n-button v-else type="error" ghost @click="revokeShare">撤销分享</n-button>
        </div>
      </n-form>
    </n-modal>

  </n-drawer-content>
    </n-drawer>

    <!-- AI Voice Input Badge (Mobile) -->
    <div v-if="isMobile" class="ai-voice-fab" @click="handleVoiceInput">
      <span>语音</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useThemeStore } from '@/stores/theme';
import { useEventStore } from '@/stores/events';
import api from '@/utils/api';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, addDays, getDate, getDay, isSameMonth, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const message = useMessage();
const themeStore = useThemeStore();
const eventStore = useEventStore();

const isMobile = computed(() => themeStore.isMobile);
const viewMode = ref<'day' | 'week' | 'month'>('month');
const currentDate = ref(new Date());
const selectedDate = ref(new Date());
const showCreateModal = ref(false);
const showDetail = ref(false);
const showShareModal = ref(false);
const sharePassword = ref('');
const shareExpiry = ref('7');
const shareUrl = ref('');
const generatingShare = ref(false);
const showAttachmentUpload = ref(false);
const attachments = ref<any[]>([]);
const uploading = ref(false);

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

async function handleUpload({ file, onFinish, onError }: any) {
  uploading.value = true;
  const formData = new FormData();
  formData.append("file", file.file || file);
  try {
    const res: any = await api.post("/events/" + selectedEvent.value.id + "/attachments", formData);
    attachments.value.push(res);
    message.success("上传成功");
    onFinish();
  } catch { message.error("上传失败"); onError(); }
  finally { uploading.value = false; }
}

async function loadAttachments(eventId: string) {
  try {
    const res: any = await api.get("/events/" + eventId + "/attachments");
    attachments.value = res;
  } catch { attachments.value = []; }
}

async function deleteAttachment(id: string) {
  try {
    await api.delete("/attachments/" + id);
    attachments.value = attachments.value.filter((a: any) => a.id !== id);
    message.success("已删除");
  } catch { message.error("删除失败"); }
}

const currentShareToken = ref('');

async function generateShare() {
  if (!selectedEvent.value) return;
  generatingShare.value = true;
  try {
    const expiresInDays = parseInt(shareExpiry.value) || undefined;
    const res: any = await api.post('/events/' + selectedEvent.value.id + '/share', {
      password: sharePassword.value || undefined,
      expiresInDays: expiresInDays || undefined,
    });
    shareUrl.value = res.shareUrl;
    currentShareToken.value = res.token;
  } catch { message.error('生成分享链接失败'); }
  finally { generatingShare.value = false; }
}

async function revokeShare() {
  if (!currentShareToken.value) return;
  try {
    await api.delete('/shared/events/' + currentShareToken.value);
    shareUrl.value = '';
    currentShareToken.value = '';
    sharePassword.value = '';
    message.success('分享已撤销');
  } catch { message.error('撤销失败'); }
}

function copyShareUrl() {
  navigator.clipboard.writeText(shareUrl.value).then(() => message.success('链接已复制'));
}

const selectedEvent = ref<any>(null);
const creating = ref(false);

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const eventTypeOptions = [
  { label: '会议', value: 'MEETING' },
  { label: '差旅', value: 'TRAVEL' },
  { label: '个人', value: 'PERSONAL' },
  { label: '任务', value: 'TASK' },
];

const newEvent = ref({
  summary: '',
  description: '',
  startTime: Date.now(),
  endTime: Date.now() + 3600000,
  eventType: 'PERSONAL',
});

const currentDateTitle = computed(() => {
  if (viewMode.value === 'month') return format(currentDate.value, 'yyyy年M月');
  if (viewMode.value === 'week') return format(startOfWeek(currentDate.value), 'M月d日') + ' - ' + format(endOfWeek(currentDate.value), 'M月d日');
  return format(currentDate.value, 'yyyy年M月d日');
});

const monthDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value));
  const end = endOfWeek(endOfMonth(currentDate.value));
  const days: any[] = [];
  let d = new Date(start);
  while (d <= end) {
    days.push({
      date: new Date(d),
      dayNumber: getDate(d),
      isToday: isToday(d),
      isCurrentMonth: isSameMonth(d, currentDate.value),
    });
    d = addDays(d, 1);
  }
  return days;
});

const weekDaysList = computed(() => {
  const start = startOfWeek(currentDate.value, { weekStartsOn: 0 });
  const end = endOfWeek(currentDate.value, { weekStartsOn: 0 });
  const days: any[] = [];
  let d = new Date(start);
  while (d <= end) {
    days.push({
      date: new Date(d),
      label: weekDays[getDay(d)],
      dayNumber: getDate(d),
    });
    d = addDays(d, 1);
  }
  return days;
});

function getEventsForDay(date: Date) {
  return eventStore.events.filter((e: any) => {
    const eStart = parseISO(e.startTime);
    return isSameDay(eStart, date);
  });
}

const selectedDateEvents = computed(() => getEventsForDay(selectedDate.value));

function isSelected(date: Date) {
  return isSameDay(date, selectedDate.value);
}

function selectDate(date: Date) {
  selectedDate.value = date;
}

function prevPeriod() {
  if (viewMode.value === 'month') currentDate.value = addMonths(currentDate.value, -1);
  else if (viewMode.value === 'week') currentDate.value = addWeeks(currentDate.value, -1);
  else currentDate.value = addDays(currentDate.value, -1);
}

function nextPeriod() {
  if (viewMode.value === 'month') currentDate.value = addMonths(currentDate.value, 1);
  else if (viewMode.value === 'week') currentDate.value = addWeeks(currentDate.value, 1);
  else currentDate.value = addDays(currentDate.value, 1);
}

function goToday() {
  currentDate.value = new Date();
  selectedDate.value = new Date();
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm');
}

function eventTypeLabel(type: string) {
  const map: any = { MEETING: '会议', TRAVEL: '差旅', PERSONAL: '个人', TASK: '任务', THIRD_PARTY: '第三方' };
  return map[type] || type;
}

async function handleCreateEvent() {
  if (!newEvent.value.summary) {
    message.warning('请输入日程标题');
    return;
  }
  creating.value = true;
  try {
    await eventStore.createEvent({
      summary: newEvent.value.summary,
      description: newEvent.value.description,
      startTime: new Date(newEvent.value.startTime).toISOString(),
      endTime: new Date(newEvent.value.endTime).toISOString(),
      eventType: newEvent.value.eventType,
    });
    message.success('日程创建成功');
    showCreateModal.value = false;
    resetNewEvent();
  } catch (err) {
    message.error('创建失败');
  } finally {
    creating.value = false;
  }
}

function resetNewEvent() {
  newEvent.value = { summary: '', description: '', startTime: Date.now(), endTime: Date.now() + 3600000, eventType: 'PERSONAL' };
}

function viewEvent(event: any) {
  selectedEvent.value = event;
  loadAttachments(event.id);
  showDetail.value = true;
}

function handleEditEvent() {
  showDetail.value = false;
  if (selectedEvent.value) {
    newEvent.value = {
      summary: selectedEvent.value.summary,
      description: selectedEvent.value.description || '',
      startTime: new Date(selectedEvent.value.startTime).getTime(),
      endTime: new Date(selectedEvent.value.endTime).getTime(),
      eventType: selectedEvent.value.eventType,
    };
    showCreateModal.value = true;
  }
}

async function handleDeleteEvent() {
  if (!selectedEvent.value) return;
  try {
    await eventStore.deleteEvent(selectedEvent.value.id);
    message.success('日程已删除');
    showDetail.value = false;
  } catch {
    message.error('删除失败');
  }
}

function handleVoiceInput() {
  message.info('语音创建日程功能即将上线');
}

watch(viewMode, () => { fetchEvents(); });
watch(currentDate, () => { fetchEvents(); });

function fetchEvents() {
  const start = startOfMonth(currentDate.value).toISOString();
  const end = endOfMonth(currentDate.value).toISOString();
  eventStore.fetchEvents(start, end);
}

onMounted(() => { fetchEvents(); });

function onDragStart(event: DragEvent, evt: any) {
  draggedEvent.value = evt;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

async function onDropWeek(event: DragEvent, targetDate: Date) {
  if (!draggedEvent.value) return;
  const evt = draggedEvent.value;
  if (evt.isRecurringInstance) { message.warning("重复事件请编辑原始日程"); draggedEvent.value = null; return; }
  const duration = new Date(evt.endTime).getTime() - new Date(evt.startTime).getTime();
  const newStart = new Date(targetDate);
  newStart.setHours(new Date(evt.startTime).getHours(), new Date(evt.startTime).getMinutes(), 0, 0);
  const newEnd = new Date(newStart.getTime() + duration);
  try {
    await eventStore.updateEvent(evt.recurringEventId || evt.id, { startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
    message.success("日程已更新"); fetchEvents();
  } catch { message.error("更新失败"); }
  draggedEvent.value = null;
}

async function onDropMonth(event: DragEvent, targetDate: Date) {
  if (!draggedEvent.value) return;
  const evt = draggedEvent.value;
  if (evt.isRecurringInstance) { message.warning("重复事件请编辑原始日程"); draggedEvent.value = null; return; }
  const duration = new Date(evt.endTime).getTime() - new Date(evt.startTime).getTime();
  const newStart = new Date(targetDate);
  newStart.setHours(new Date(evt.startTime).getHours(), new Date(evt.startTime).getMinutes(), 0, 0);
  const newEnd = new Date(newStart.getTime() + duration);
  try {
    await eventStore.updateEvent(evt.recurringEventId || evt.id, { startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
    message.success("日程已更新"); fetchEvents();
  } catch { message.error("更新失败"); }
  draggedEvent.value = null;
}


</script>

<style scoped>
.dashboard { padding: 16px; height: 100%; display: flex; flex-direction: column; }
.dashboard-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.current-date { font-size: 18px; font-weight: 600; flex: 1; min-width: 140px; }
.header-actions { display: flex; gap: 4px; align-items: center; }

.dashboard-body { flex: 1; display: flex; gap: 16px; overflow: hidden; }
.calendar-section { flex: 1; overflow: auto; }
.event-list-section { width: 280px; border-left: 1px solid #e8eaed; padding-left: 16px; overflow-y: auto; }
.event-list-section h4 { font-size: 14px; margin-bottom: 12px; color: #333; }

.month-grid { }
.weekday-header { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; color: #666; padding: 8px 0; border-bottom: 1px solid #e8eaed; }
.month-grid-body { display: grid; grid-template-columns: repeat(7, 1fr); }
.day-cell { min-height: 80px; padding: 4px; border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; cursor: pointer; }
.day-cell:hover { background: #f5f7fa; }
.day-today .day-number { background: #667eea; color: #fff; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; }
.day-other { opacity: 0.35; }
.day-number { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
.day-events { display: flex; gap: 2px; flex-wrap: wrap; }
.day-event-dot { width: 6px; height: 6px; border-radius: 50%; }

.day-week-view { display: flex; gap: 8px; height: 100%; overflow-x: auto; }
.day-column { flex: 1; min-width: 100px; border: 1px solid #e8eaed; border-radius: 8px; padding: 8px; cursor: pointer; }
.day-column-selected { border-color: #667eea; background: #f5f7ff; }
.day-column-header { text-align: center; padding-bottom: 8px; border-bottom: 1px solid #e8eaed; margin-bottom: 8px; }
.day-name { font-size: 12px; color: #666; }
.day-num { font-size: 20px; font-weight: 600; display: block; }
.day-column-events { display: flex; flex-direction: column; gap: 4px; }

.event-card { padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.event-meeting { background: #e8f5e9; border-left: 3px solid #4caf50; }
.event-travel { background: #e3f2fd; border-left: 3px solid #2196f3; }
.event-personal { background: #fff3e0; border-left: 3px solid #ff9800; }
.event-task { background: #fce4ec; border-left: 3px solid #e91e63; }
.event-third_party { background: #f3e5f5; border-left: 3px solid #9c27b0; }
.event-time { font-weight: 500; margin-right: 4px; }
.event-title { }

.event-list-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; cursor: pointer; }
.event-list-item:hover { background: #f5f7fa; }
.event-type-badge { width: 4px; height: 32px; border-radius: 2px; flex-shrink: 0; }
.badge-meeting { background: #4caf50; }
.badge-travel { background: #2196f3; }
.badge-personal { background: #ff9800; }
.badge-task { background: #e91e63; }
.event-list-content { flex: 1; min-width: 0; }
.event-list-title { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-list-time { font-size: 12px; color: #999; }

.empty-state { text-align: center; color: #999; padding: 32px; font-size: 14px; }

.event-detail p { margin-bottom: 8px; font-size: 14px; line-height: 1.6; }

.drag-instance { opacity: 0.7; border-style: dashed; }
.drag-over { background: #e3f2fd !important; }

.ai-voice-fab { position: fixed; right: 16px; bottom: 72px; width: 48px; height: 48px; border-radius: 50%; background: #667eea; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(102,126,234,0.4); cursor: pointer; z-index: 50; }

@media (max-width: 768px) {
  .dashboard-header { gap: 8px; }
  .dashboard-body { flex-direction: column; }
  .event-list-section { width: 100%; border-left: none; padding-left: 0; border-top: 1px solid #e8eaed; padding-top: 12px; margin-top: 12px; max-height: 200px; }
  .day-cell { min-height: 60px; }
}
</style>




