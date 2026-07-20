import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null);
  const token = ref(localStorage.getItem('token') || '');
  const isLoggedIn = ref(!!token.value);

  async function login(email: string, password: string, tenantDomain: string) {
    const res: any = await api.post('/auth/login', { email, password, tenantDomain });
    token.value = res.access_token;
    user.value = res.user;
    localStorage.setItem('token', res.access_token);
    isLoggedIn.value = true;
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    isLoggedIn.value = false;
  }

  return { user, token, isLoggedIn, login, logout };
});
