# Richeng - 日程管理系统 一键设置脚本
Write-Host "===== Richeng 日程管理 初始化 =====" -ForegroundColor Cyan

# 1. 安装依赖
Write-Host "[1/4] 安装项目依赖..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Host "pnpm install 失败，请重试" -ForegroundColor Red; exit 1 }

# 2. 生成 Prisma 客户端
Write-Host "[2/4] 生成 Prisma 客户端..." -ForegroundColor Yellow
cd packages/backend
pnpm db:generate
if ($LASTEXITCODE -ne 0) { Write-Host "Prisma 生成失败" -ForegroundColor Red; exit 1 }

# 3. 数据库迁移
Write-Host "[3/4] 运行数据库迁移..." -ForegroundColor Yellow
pnpm db:push
if ($LASTEXITCODE -ne 0) {
  Write-Host "数据库迁移失败 - 请确认 Docker 已启动 (docker-compose up -d)" -ForegroundColor Red
  Write-Host "或检查 .env 中的 DATABASE_URL 配置" -ForegroundColor Yellow
  exit 1
}

# 4. 种子数据
Write-Host "[4/4] 导入种子数据..." -ForegroundColor Yellow
pnpm db:seed

Write-Host "`n===== 初始化完成! =====" -ForegroundColor Green
Write-Host "启动方式:" -ForegroundColor Cyan
Write-Host "  后端: cd packages/backend && pnpm dev" -ForegroundColor White
Write-Host "  前端: cd packages/frontend && pnpm dev" -ForegroundColor White
Write-Host "  或: pnpm dev (同时启动)" -ForegroundColor White
Write-Host "`n测试账号:" -ForegroundColor Cyan
Write-Host "  管理员: admin@example.com / admin123" -ForegroundColor White
Write-Host "  普通用户: user@example.com / user123" -ForegroundColor White
Write-Host "  租户域名: example.com" -ForegroundColor White
