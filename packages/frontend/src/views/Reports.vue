<template>
  <div class="reports-page">
    <div class="page-header">
      <h3>周报</h3>
      <n-date-picker v-model:value="weekPicker" type="date" @update:value="fetchReport" />
    </div>

    <n-spin :show="loading">
      <div v-if="report" class="report-content">
        <n-card :title="`周报: ${report.weekStart} ~ ${report.weekEnd}`">
          <n-descriptions label-placement="left" :column="3">
            <n-descriptions-item label="总日程数">{{ report.totalEvents }}</n-descriptions-item>
            <n-descriptions-item label="总时长">{{ report.totalHours }} 小时</n-descriptions-item>
            <n-descriptions-item label="日均">{{ (report.totalHours / 7).toFixed(1) }} 小时</n-descriptions-item>
          </n-descriptions>

          <h4 style="margin: 16px 0 8px;">类型分布</h4>
          <n-progress v-for="t in report.byType" :key="t.type" :type="'line'" :percentage="t.percentage" : indicator-placement="'inside'">
            {{ t.type }} ({{ t.count }}个, {{ t.hours }}h)
          </n-progress>

          <h4 style="margin: 16px 0 8px;">每日明细</h4>
          <n-table :single-line="false">
            <thead>
              <tr><th>日期</th><th>数量</th><th>时长</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in report.dailyBreakdown" :key="d.date">
                <td>{{ d.date }} {{ d.dayName }}</td>
                <td>{{ d.count }}</td>
                <td>{{ d.hours.toFixed(1) }}h</td>
              </tr>
            </tbody>
          </n-table>

          <h4 style="margin: 16px 0 8px;">最长日程 TOP 10</h4>
          <n-list>
            <n-list-item v-for="(e, i) in report.topEvents" :key="i">
              <n-thing :title="`${i+1}. ${e.summary}`" :description="`${e.date} | ${e.type} | ${e.duration}h`" />
            </n-list-item>
          </n-list>
        </n-card>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/utils/api';
import { startOfWeek } from 'date-fns';

const message = useMessage();
const loading = ref(false);
const report = ref<any>(null);
const weekPicker = ref(Date.now());

async function fetchReport() {
  loading.value = true;
  try {
    const weekStart = startOfWeek(new Date(weekPicker.value), { weekStartsOn: 1 }).toISOString();
    const res: any = await api.get('/reports/weekly', { params: { weekStart } });
    report.value = res;
  } catch { message.error('获取周报失败'); }
  finally { loading.value = false; }
}

onMounted(fetchReport);
</script>

<style scoped>
.reports-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { font-size: 20px; }
.report-content { max-width: 800px; }
</style>
