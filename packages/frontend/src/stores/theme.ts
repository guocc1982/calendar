import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isMobile = ref(window.innerWidth < 768);
  const updateMobile = () => { isMobile.value = window.innerWidth < 768; };
  window.addEventListener('resize', updateMobile);
  return { isMobile };
});
