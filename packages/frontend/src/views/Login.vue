<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">日程管理系统</h1>
      <p class="login-desc">Richeng - 企业多租户日程管理</p>
      <n-form ref="formRef" :model="form" label-placement="top" @submit.prevent="handleLogin">
        <n-form-item label="企业域名" path="tenantDomain">
          <n-input v-model:value="form.tenantDomain" placeholder="请输入企业域名" />
        </n-form-item>
        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="form.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="请输入密码" show-password-on="click" />
        </n-form-item>
        <n-button type="primary" block attr-type="submit" :loading="loading">
          登录
        </n-button>
      </n-form>
      <div class="saml-section">
        <n-divider>或</n-divider>
        <n-button block @click="handleSAML">企业 SSO 登录</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMessage } from 'naive-ui';

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();
const loading = ref(false);

const form = reactive({
  email: '',
  password: '',
  tenantDomain: '',
});

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login(form.email, form.password, form.tenantDomain);
    message.success('登录成功');
    router.push('/');
  } catch (err: any) {
    message.error(err.response?.data?.message || '登录失败');
  } finally {
    loading.value = false;
  }
}

function handleSAML() {
  message.info('SAML SSO 将在后续版本中支持');
}
</script>

<style scoped>
.login-container {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
}
.login-card {
  background: #fff; border-radius: 12px; padding: 40px;
  width: 100%; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
.login-title { font-size: 24px; text-align: center; margin-bottom: 4px; }
.login-desc { font-size: 14px; color: #666; text-align: center; margin-bottom: 24px; }
.saml-section { margin-top: 16px; }
@media (max-width: 768px) {
  .login-card { padding: 24px 16px; }
}
</style>
