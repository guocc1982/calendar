# Richeng - 日程管理系统

企业多租户日程管理系统。技术栈：Vue 3 + NestJS + PostgreSQL + Redis + RabbitMQ

## 快速开始

```bash
cd D:\Users\guocc\Documents\richeng

# 安装依赖
pnpm install

# 启动基础设施（PostgreSQL + Redis + RabbitMQ）
docker-compose up -d

# 初始化数据库
cd packages/backend
pnpm db:push
pnpm db:seed

# 开发模式
# 终端1 - 后端 (http://localhost:3000)
cd packages/backend && pnpm dev

# 终端2 - 前端 (http://localhost:5173)
cd packages/frontend && pnpm dev
```

### 测试账号
| 角色 | 邮箱 | 密码 | 租户域名 |
|------|------|------|----------|
| 管理员 | admin@example.com | admin123 | example.com |
| 普通用户 | user@example.com | user123 | example.com |

## 后端开发命令
```bash
cd packages/backend

pnpm dev              # 开发模式（watch 自动重启）
pnpm dev:debug        # 开发 + 调试端口 9229
pnpm build            # 编译生产版本
pnpm start            # 启动生产版本
pnpm start:inspect    # 启动 + 等待调试器

pnpm db:generate      # 生成 Prisma Client
pnpm db:push          # 同步 schema 到数据库
pnpm db:seed          # 导入种子数据
```

## 前端开发命令
```bash
cd packages/frontend

pnpm dev              # 开发模式（Vite 热更新）
pnpm build            # 生产构建
pnpm preview          # 预览生产构建
```

## VS Code 调试

按 F5，选择配置：
- 后端 - NestJS (Debug) — 启动后端 + 断点调试
- 后端 - NestJS (Attach) — 附加到运行中的调试端口 9229
- 前端 - Vite (Chrome) — Chrome + 前端源码调试
- 前后端同时调试 — 同时启动两者

## 项目结构
```
richeng/
├── docker-compose.yml         # PostgreSQL + Redis + RabbitMQ
├── packages/backend/          # NestJS 16 个模块
│   ├── prisma/                # 14 张数据表 + 种子数据
│   └── src/                   # auth/tenant/user/org/event/third-party/ai...
└── packages/frontend/         # Vue 3 + Vite 9 个页面
    └── src/                   # Dashboard/TeamCalendar/Reports/Admin...
```

## API Key 示例（第三方推送）

```bash
# 注册应用
curl -X POST http://localhost:3000/api/v1/admin/third-party/apps \
  -H "Authorization: Bearer <token>" \
  -d '{"appName": "会议系统"}'

# 推送日程
curl -X POST http://localhost:3000/api/v1/external/events \
  -H "x-api-key: <key>" \
  -d '{"eventId":"m-001","source":"meeting","summary":"Q3评审","startTime":"2026-07-22T09:00:00+08:00","endTime":"2026-07-22T11:00:00+08:00"}'
```

> 完整方案见 [技术方案文档](/%E6%97%A5%E7%A8%8B%E5%BA%94%E7%94%A8%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88.md)
