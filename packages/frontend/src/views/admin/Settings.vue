<template>
  <div class="admin-page">
    <div class="page-header">
      <h3>租户设置</h3>
    </div>
    <n-card title="基本信息" style="max-width: 600px;">
      <n-form label-placement="left" :label-width="100">
        <n-form-item label="租户名称">
          <n-input v-model:value="tenant.name" />
        </n-form-item>
        <n-form-item label="域名">
          <n-input v-model:value="tenant.domain" disabled />
        </n-form-item>
        <n-form-item label="套餐">
          <n-select v-model:value="tenant.plan" :options="planOptions" />
        </n-form-item>
        <n-button type="primary" @click="handleSave">保存</n-button>
      </n-form>
    </n-card>

    <n-card title="功能开关" style="max-width: 600px; margin-top: 16px;">
      <n-form label-placement="left" :label-width="180">
        <n-form-item label="AI 智能功能">
          <n-switch v-model:value="features.ai" />
        </n-form-item>
        <n-form-item label="第三方集成">
          <n-switch v-model:value="features.thirdParty" />
        </n-form-item>
        <n-form-item label="团队日历">
          <n-switch v-model:value="features.teamCalendar" />
        </n-form-item>
        <n-button type="primary" @click="handleSaveFeatures">保存功能设置</n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/utils/api';

const message = useMessage();
const tenant = ref({ name: '', domain: '', plan: 'enterprise' });
const features = reactive({ ai: true, thirdParty: true, teamCalendar: true });

const planOptions = [
  { label: '基础版', value: 'basic' },
  { label: '企业版', value: 'enterprise' },
  { label: '旗舰版', value: 'premium' },
];

onMounted(async () => {
  try {
    const res: any = await api.get('/tenants/me');
    tenant.value = res;
    if (res.features) Object.assign(features, res.features);
  } catch { /* not critical */ }
});

async function handleSave() {
  try {
    await api.patch('/tenant', { name: tenant.value.name, plan: tenant.value.plan });
    message.success('保存成功');
  } catch { message.error('保存失败'); }
}

async function handleSaveFeatures() {
  try {
    await api.patch('/tenant', { features });
    message.success('功能设置已保存');
  } catch { message.error('保存失败'); }
}
</script>

<style scoped>
.admin-page { padding: 24px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { font-size: 20px; }
</style>

