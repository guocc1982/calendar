<template>
  <div class="rrule-editor">
    <n-form-item label="重复规则">
      <n-radio-group v-model:value="freq" @update:value="updateRRule">
        <n-space>
          <n-radio value="">不重复</n-radio>
          <n-radio value="DAILY">每天</n-radio>
          <n-radio value="WEEKLY">每周</n-radio>
          <n-radio value="MONTHLY">每月</n-radio>
          <n-radio value="YEARLY">每年</n-radio>
        </n-space>
      </n-radio-group>
    </n-form-item>

    <div v-if="freq" class="rrule-details">
      <n-form-item v-if="freq === 'WEEKLY'" label="重复日">
        <n-checkbox-group v-model:value="weekDays" @update:value="updateRRule">
          <n-space>
            <n-checkbox v-for="d in weekDayOptions" :key="d.value" :value="d.value" :label="d.label" />
          </n-space>
        </n-checkbox-group>
      </n-form-item>

      <n-form-item label="结束条件">
        <n-radio-group v-model:value="endType" @update:value="updateRRule">
          <n-space vertical>
            <n-radio value="never">永不结束</n-radio>
            <n-radio value="count">共 N 次后结束</n-radio>
            <n-radio value="date">指定日期结束</n-radio>
          </n-space>
        </n-radio-group>
      </n-form-item>

      <n-form-item v-if="endType === 'count'" label="重复次数">
        <n-input-number v-model:value="count" :min="1" :max="999" @update:value="updateRRule" />
      </n-form-item>

      <n-form-item v-if="endType === 'date'" label="结束日期">
        <n-date-picker v-model:value="endDate" type="date" @update:value="updateRRule" />
      </n-form-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { format } from 'date-fns';

const emit = defineEmits(['update:rrule']);

const freq = ref('');
const weekDays = ref<number[]>([]);
const endType = ref('never');
const count = ref(10);
const endDate = ref<number | null>(null);

const weekDayOptions = [
  { label: '周一', value: 1 }, { label: '周二', value: 2 },
  { label: '周三', value: 3 }, { label: '周四', value: 4 },
  { label: '周五', value: 5 }, { label: '周六', value: 6 },
  { label: '周日', value: 0 },
];

function updateRRule() {
  if (!freq.value) {
    emit('update:rrule', null);
    return;
  }
  let rrule = 'FREQ=' + freq.value;
  if (freq.value === 'WEEKLY' && weekDays.value.length > 0) {
    rrule += ';BYDAY=' + weekDays.value.sort().map((d: number) => ['SU','MO','TU','WE','TH','FR','SA'][d]).join(',');
  }
  if (endType.value === 'count') rrule += ';COUNT=' + count.value;
  if (endType.value === 'date' && endDate.value) {
    rrule += ';UNTIL=' + format(new Date(endDate.value), 'yyyyMMdd\'T\'235959\'Z\'');
  }
  emit('update:rrule', rrule);
}
</script>

<style scoped>
.rrule-editor { margin-top: 8px; }
.rrule-details { margin-top: 8px; padding: 12px; background: #f9f9f9; border-radius: 6px; }
</style>

