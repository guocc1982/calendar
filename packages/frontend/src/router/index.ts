import { createRouter, createWebHistory } from 'vue-router';
import Login from '@/views/Login.vue';
import Dashboard from '@/views/Dashboard.vue';
import AppLayout from '@/components/AppLayout.vue';
import ThirdPartyApps from '@/views/admin/ThirdPartyApps.vue';
import Settings from '@/views/admin/Settings.vue';
import NotificationCenter from '@/views/NotificationCenter.vue';
import TeamCalendar from '@/views/TeamCalendar.vue';
import AuditLogs from '@/views/admin/AuditLogs.vue';
import Reports from '@/views/Reports.vue';
import ApprovalRequests from '@/views/admin/ApprovalRequests.vue';

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'Dashboard', component: Dashboard },
      { path: 'admin/third-party', name: 'ThirdPartyApps', component: ThirdPartyApps },
      { path: 'admin/settings', name: 'Settings', component: Settings },
      { path: 'notifications', name: 'NotificationCenter', component: NotificationCenter },
      { path: 'team', name: 'TeamCalendar', component: TeamCalendar },
      { path: 'admin/audit-logs', name: 'AuditLogs', component: AuditLogs },
      { path: 'reports', name: 'Reports', component: Reports },
      { path: 'admin/approvals', name: 'ApprovalRequests', component: ApprovalRequests },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.public) {
    next();
  } else if (!token) {
    next('/login');
  } else {
    next();
  }
});

export default router;





