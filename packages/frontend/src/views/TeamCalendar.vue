<template>
  <div class="team-calendar">
    <div class="tc-header">
      <h3>团队日历</h3>
      <div class="tc-controls">
        <n-button-group size="small">
          <n-button :type="viewMode === 'day' ? 'primary' : 'default'" @click="viewMode = 'day'">日</n-button>
          <n-button :type="viewMode === 'week' ? 'primary' : 'default'" @click="viewMode = 'week'">周</n-button>
        </n-button-group>
        <n-button size="small" @click="prevPeriod">&lt;</n-button>
        <span class="tc-date-title">{{ dateTitle }}</span>
        <n-button size="small" @click="nextPeriod">&gt;</n-button>
        <n-button size="small" @click="goToday">今天</n-button>
      </div>
    </div>

    <div class="tc-body">
      <!-- Member Panel -->
      <aside class="tc-members">
        <h4>团队成员</h4>
        <n-input v-model:value="searchQuery" placeholder="搜索成员..." size="small" clearable style="margin-bottom: 8px;" />
        <n-checkbox v-if="filteredMembers.length > 0" :checked="allSelected" @update:checked="toggleAll" style="margin-bottom: 4px;">
          全选 ({{ selectedCount }}/{{ filteredMembers.length }})
        </n-checkbox>
        <div class="member-list">
          <div
            v-for="member in filteredMembers"
            :key="member.id"
            :class="['member-item', { selected: selectedIds.has(member.id) }]"
            @click="toggleMember(member.id)"
          >
            <div :class="['member-avatar', 'c' + (userColorIndex(member.id) % 8)]">
              {{ member.name.charAt(0) }}
            </div>
            <div class="member-info">
              <span class="member-name">{{ member.name }}</span>
              <span class="member-dept">{{ member.orgName || '' }}</span>
            </div>
            <n-checkbox :checked="selectedIds.has(member.id)" style="pointer-events: none;" />
          </div>
        </div>
      </aside>

      <!-- Calendar Grid -->
      <div class="tc-calendar">
        <!-- Empty state -->
        <div v-if="selectedIds.size === 0" class="tc-empty">
          <p>请从左侧选择要查看的团队成员</p>
        </div>

        <!-- Day view -->
        <div v-else-if="viewMode === 'day'" class="day-view">
          <div class="day-view-header">
            <strong>{{ formatDayHeader(currentDate) }}</strong>
          </div>
          <div class="day-view-grid">
            <div v-for="h in 24" :key="h" class="hour-row" @click="handleHourClick(currentDate, h)">
              <span class="hour-label">{{ String(h - 1).padStart(2, '0') }}:00</span>
              <div class="hour-content">
                <div class="hour-slot"></div>
                <div
                  v-for="event in getEventsForHour(h - 1)"
                  :key="event.id"
                  :style="{ left: event.column * 30 + '%', width: (100 / event.totalColumns) + '%', background: userColor(event.userId) }"
                  :class="['event-block', { 'event-long': event.duration > 1 }]"
                  @click.stop="viewEvent(event)"
                >
                  <span class="event-block-time">{{ formatTime(event.startTime) }}</span>
                  <span class="event-block-title">{{ event.summary }}</span>
                  <span class="event-block-user">- {{ event.user?.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Week view -->
        <div v-else class="week-view">
          <div class="week-header">
            <div v-for="day in weekDays" :key="day.date" class="week-header-cell" @click="currentDate = new Date(day.date)">
              <span class="week-day-name">{{ day.label }}</span>
              <span :class="['week-day-num', { 'week-today': day.isToday }]">{{ day.dayNumber }}</span>
            </div>
          </div>
          <div class="week-body">
            <div v-for="day in weekDays" :key="day.date" class="week-day-col">
              <div class="week-day-events">
                <div
                  v-for="event in getEventsForDay(day.date)"
                  :key="event.id"
                  :style="{ 'border-left-color': userColor(event.userId) }"
                  class="week-event-card"
                  @click="viewEvent(event)"
                >
                  <span class="week-event-time">{{ formatTime(event.startTime) }}</span>
                  <span class="week-event-title">{{ event.summary }}</span>
                  <span class="week-event-user">{{ event.user?.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Detail Drawer -->
    <n-drawer v-model:show="showDetail" :width="320" :placement="isMobile ? 'bottom' : 'right'">
      <n-drawer-content :title="selectedEvent?.summary" closable>
        <div v-if="selectedEvent" class="event-detail">
          <p><strong>所属人：</strong>{{ selectedEvent.user?.name }}</p>
          <p><strong>时间：</strong>{{ formatTime(selectedEvent.startTime) }} - {{ formatTime(selectedEvent.endTime) }}</p>
          <p v-if="selectedEvent.description"><strong>描述：</strong>{{ selectedEvent.description }}</p>
          <p v-if="selectedEvent.eventType"><strong>类型：</strong>{{ eventTypeLabel(selectedEvent.eventType) }}</p>
          <p v-if="selectedEvent.location?.name"><strong>地点：</strong>{{ selectedEvent.location.name }}</p>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { format, parseISO, startOfWeek, endOfWeek, addDays, addWeeks, getDate, getDay, isSameDay, isToday, differenceInHours } from 'date-fns';

const message = useMessage();
const router = useRouter();

const viewMode = ref<'day' | 'week'>('week');
const currentDate = ref(new Date());
const members = ref<any[]>([]);
const selectedIds = ref<Set<string>>(new Set());
const searchQuery = ref('');
const allEvents = ref<any[]>([]);
const loading = ref(false);
const showDetail = ref(false);
const selectedEvent = ref<any>(null);
const isMobile = ref(window.innerWidth < 768);

const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];

const weekDays = computed(() => {
  const start = startOfWeek(currentDate.value, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { date: d, label: weekDayNames[getDay(d)], dayNumber: getDate(d), isToday: isToday(d) };
  });
});

const dateTitle = computed(() => {
  if (viewMode.value === 'week') {
    const start = startOfWeek(currentDate.value);
    const end = endOfWeek(currentDate.value);
    return format(start, 'M月d日') + ' - ' + format(end, 'M月d日');
  }
  return format(currentDate.value, 'yyyy年M月d日');
});

const filteredMembers = computed(() => {
  if (!searchQuery.value) return members.value;
  const q = searchQuery.value.toLowerCase();
  return members.value.filter(m => m.name.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q));
});

const selectedCount = computed(() => selectedIds.value.size);
const allSelected = computed(() => filteredMembers.value.length > 0 && selectedIds.value.size === filteredMembers.value.length);

const userColors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

function userColorIndex(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  return Math.abs(hash);
}

function userColor(userId: string) {
  return userColors[userColorIndex(userId) % userColors.length] + '20';
}

function toggleMember(id: string) {
  const newSet = new Set(selectedIds.value);
  if (newSet.has(id)) newSet.delete(id);
  else newSet.add(id);
  selectedIds.value = newSet;
  if (newSet.size > 0) fetchTeamEvents();
}

function toggleAll(checked: boolean) {
  if (checked) {
    selectedIds.value = new Set(filteredMembers.value.map(m => m.id));
  } else {
    selectedIds.value = new Set();
  }
  if (selectedIds.value.size > 0) fetchTeamEvents();
}

function prevPeriod() {
  currentDate.value = viewMode.value === 'week' ? addWeeks(currentDate.value, -1) : addDays(currentDate.value, -1);
}

function nextPeriod() {
  currentDate.value = viewMode.value === 'week' ? addWeeks(currentDate.value, 1) : addDays(currentDate.value, 1);
}

function goToday() {
  currentDate.value = new Date();
}

function formatDayHeader(date: Date) {
  return format(date, 'M月d日 EEEE');
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm');
}

function eventTypeLabel(type: string) {
  const map: any = { MEETING: '会议', TRAVEL: '差旅', PERSONAL: '个人', TASK: '任务', THIRD_PARTY: '第三方' };
  return map[type] || type;
}

function getEventsForDay(date: Date) {
  return allEvents.value.filter((e: any) => isSameDay(parseISO(e.startTime), date));
}

function getEventsForHour(hour: number) {
  const dayEvents = getEventsForDay(currentDate.value);
  const hourEvents = dayEvents.filter((e: any) => {
    const startH = parseISO(e.startTime).getHours();
    const endH = parseISO(e.endTime).getHours();
    return startH <= hour && endH > hour;
  });

  // Calculate overlap columns for horizontal layout
  const sorted = hourEvents.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const columns: any[] = [];
  for (const evt of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      if (new Date(evt.startTime).getTime() >= new Date(lastInCol.endTime).getTime()) {
        columns[col].push(evt);
        evt.column = col;
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([evt]);
      evt.column = columns.length - 1;
    }
    evt.totalColumns = Math.max(columns.length, 1);
    evt.duration = differenceInHours(parseISO(evt.endTime), parseISO(evt.startTime));
  }
  return sorted;
}

function handleHourClick(date: Date, hour: number) {
  message.info('点击 ' + format(date, 'M月d日') + ' ' + String(hour - 1).padStart(2, '0') + ':00 - 新建日程');
}

function viewEvent(event: any) {
  selectedEvent.value = event;
  showDetail.value = true;
}

async function fetchMembers() {
  try {
    const res: any = await api.get('/users');
    members.value = res;
  } catch { message.error('获取团队成员失败'); }
}

async function fetchTeamEvents() {
  if (selectedIds.value.size === 0) return;
  loading.value = true;
  try {
    const start = startOfWeek(currentDate.value).toISOString();
    const end = endOfWeek(currentDate.value).toISOString();
    const ids = Array.from(selectedIds.value).join(',');
    const res: any = await api.get('/events/team', { params: { userIds: ids, startDate: start, endDate: end } });
    allEvents.value = res;
  } finally { loading.value = false; }
}

import api from '@/utils/api';

watch([viewMode, currentDate], () => { if (selectedIds.value.size > 0) fetchTeamEvents(); });

onMounted(() => {
  fetchMembers();
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 768; });
});
</script>

<style scoped>
.team-calendar { display: flex; flex-direction: column; height: 100%; }
.tc-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e8eaed; flex-wrap: wrap; gap: 8px; }
.tc-header h3 { font-size: 18px; }
.tc-controls { display: flex; align-items: center; gap: 6px; }
.tc-date-title { font-size: 14px; font-weight: 500; min-width: 130px; text-align: center; }

.tc-body { display: flex; flex: 1; overflow: hidden; }

.tc-members { width: 240px; border-right: 1px solid #e8eaed; padding: 12px; overflow-y: auto; flex-shrink: 0; }
.tc-members h4 { font-size: 14px; margin-bottom: 8px; }

.member-list { }
.member-item { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-radius: 6px; cursor: pointer; margin-bottom: 2px; }
.member-item:hover { background: #f5f7fa; }
.member-item.selected { background: #f0f4ff; }
.member-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; flex-shrink: 0; }
.c0 { background: #4caf50; } .c1 { background: #2196f3; } .c2 { background: #ff9800; }
.c3 { background: #e91e63; } .c4 { background: #9c27b0; } .c5 { background: #00bcd4; }
.c6 { background: #795548; } .c7 { background: #607d8b; }
.member-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.member-name { font-size: 13px; font-weight: 500; }
.member-dept { font-size: 11px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tc-calendar { flex: 1; overflow-y: auto; padding: 12px; }
.tc-empty { display: flex; align-items: center; justify-content: center; height: 200px; color: #999; }

.day-view { }
.day-view-header { font-size: 16px; margin-bottom: 12px; text-align: center; }
.day-view-grid { }
.hour-row { display: flex; border-bottom: 1px solid #f0f0f0; min-height: 48px; cursor: pointer; }
.hour-row:hover { background: #fafafa; }
.hour-label { width: 48px; font-size: 11px; color: #999; padding: 4px 4px 0 0; text-align: right; flex-shrink: 0; }
.hour-content { flex: 1; position: relative; min-height: 48px; }
.hour-slot { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.event-block { position: absolute; top: 2px; bottom: 2px; border-radius: 4px; padding: 2px 6px; font-size: 11px; overflow: hidden; cursor: pointer; z-index: 2; }
.event-block-long { }
.event-block-time { font-weight: 500; }
.event-block-title { margin-left: 2px; }
.event-block-user { opacity: 0.7; margin-left: 2px; }

.week-view { }
.week-header { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 8px; }
.week-header-cell { cursor: pointer; padding: 4px; }
.week-day-name { display: block; font-size: 12px; color: #666; }
.week-day-num { display: inline-block; font-size: 18px; font-weight: 500; width: 32px; height: 32px; line-height: 32px; border-radius: 50%; }
.week-today { background: #667eea; color: #fff; }

.week-body { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.week-day-col { min-height: 300px; border: 1px solid #e8eaed; border-radius: 6px; padding: 4px; }
.week-day-events { display: flex; flex-direction: column; gap: 4px; }
.week-event-card { padding: 4px 6px; border-left: 3px solid #667eea; border-radius: 3px; background: #f9f9f9; font-size: 11px; cursor: pointer; line-height: 1.4; }
.week-event-card:hover { background: #f0f4ff; }
.week-event-time { font-weight: 500; margin-right: 2px; }
.week-event-title { }
.week-event-user { opacity: 0.6; margin-left: 2px; }

.event-detail p { margin-bottom: 8px; font-size: 14px; line-height: 1.6; }

@media (max-width: 768px) {
  .tc-members { display: none; }
  .week-body { grid-template-columns: repeat(1, 1fr); }
  .week-header { grid-template-columns: repeat(7, 1fr); overflow-x: auto; }
  .tc-controls { width: 100%; justify-content: center; }
}
</style>

