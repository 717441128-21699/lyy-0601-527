# 团队协作平台后端服务

基于 NestJS 10 + TypeScript + PostgreSQL + Prisma ORM 构建的企业级团队协作平台后端服务，支持项目管理、任务流转、日程安排、文件管理等核心功能。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | 10.x | 企业级 Node.js 框架 |
| TypeScript | 5.1.x | 类型安全的 JavaScript 超集 |
| PostgreSQL | 14+ | 关系型数据库 |
| Prisma | 5.7.x | 下一代 ORM |
| JWT | - | 身份认证 |
| Passport.js | - | 认证中间件 |
| Swagger | 7.x | API 文档 |
| bcrypt | 5.x | 密码加密 |

## 功能模块

### 1. 项目空间模块
- 创建、编辑、删除、归档项目
- 项目成员邀请与移除
- 项目角色授权
- 项目状态管理（规划中、进行中、已暂停、已完成、已取消）

### 2. 成员权限模块
- 5 种系统角色：所有者、管理员、成员、查看者、访客
- 支持自定义角色
- 细粒度权限配置（模块级 + 操作级）
- 角色权限动态校验

### 3. 任务流转模块
- 任务新建、编辑、删除
- 任务分派与重新分派
- 优先级设置（紧急、高、中、低）
- 截止期设置与提醒
- 子任务拆分
- 状态变更记录（待办、进行中、评审、测试、完成、阻塞、取消）
- 评论讨论与 @提及
- 里程碑关联

### 4. 日程安排模块
- 日程 CRUD 操作
- 日程重复规则（每日、每周、每月、每年）
- 时间段占用查询
- 冲突检测
- 里程碑提醒
- 参与人管理

### 5. 文件索引模块
- 文件上传记录
- 文件归属关联（项目、任务、日程）
- 关键词检索（文件名、描述）
- 文件版本管理
- 下载统计

### 6. 消息提醒模块
- 多种消息类型（任务分配、状态变更、评论提及、日程提醒、里程碑）
- 未读消息汇总
- 消息已读/未读标记
- 批量已读
- 消息分类筛选

### 7. 统计看板模块
- 个人待办拉取
- 项目进度统计
- 任务分布统计
- 任务趋势图
- 成员绩效统计
- 操作记录查询
- 项目活动日志

## 快速开始

### 环境要求

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm >= 9.x

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env` 文件并根据实际情况修改：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/team_collab?schema=public"

# JWT 配置
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# 应用配置
APP_PORT=3000
APP_HOST="0.0.0.0"
APP_NAME="Team Collaboration Platform"

# 环境
NODE_ENV="development"

# 文件上传
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"

# 限流
THROTTLE_TTL=60
THROTTLE_LIMIT=1000
```

### 数据库初始化

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate:dev

# 填充种子数据（可选）
npm run seed
```

### 启动服务

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 访问 API 文档

启动服务后，访问 Swagger 文档：
- 文档地址：http://localhost:3000/api/docs
- API 前缀：http://localhost:3000/api/v1

## 项目结构

```
src/
├── auth/                    # 认证模块
│   ├── dto/                 # 数据传输对象
│   ├── strategies/          # 认证策略
│   ├── auth.controller.ts   # 认证控制器
│   ├── auth.module.ts       # 认证模块
│   └── auth.service.ts      # 认证服务
├── common/                  # 公共基础设施
│   ├── decorators/          # 装饰器
│   ├── dto/                 # 公共 DTO
│   ├── filters/             # 异常过滤器
│   ├── guards/              # 守卫
│   ├── interceptors/        # 拦截器
│   └── utils/               # 工具函数
├── modules/                 # 业务模块
│   ├── file/                # 文件模块
│   ├── message/             # 消息模块
│   ├── operation-log/       # 操作日志模块
│   ├── project/             # 项目模块
│   ├── role/                # 角色模块
│   ├── schedule/            # 日程模块
│   ├── stats/               # 统计模块
│   └── task/                # 任务模块
├── prisma/                  # Prisma 配置
│   ├── prisma.module.ts     # Prisma 模块
│   └── prisma.service.ts    # Prisma 服务
├── app.module.ts            # 根模块
└── main.ts                  # 应用入口
```

## 数据库设计

### 核心数据表

| 表名 | 说明 |
|------|------|
| User | 用户表 |
| Project | 项目表 |
| ProjectMember | 项目成员表 |
| Role | 角色表 |
| Task | 任务表 |
| TaskComment | 任务评论表 |
| TaskStatusHistory | 任务状态历史表 |
| Schedule | 日程表 |
| File | 文件表 |
| Message | 消息表 |
| Milestone | 里程碑表 |
| OperationLog | 操作日志表 |

### 权限体系

权限采用 `模块.操作` 的二维结构：

```json
{
  "project": { "create": true, "read": true, "update": true, "delete": true },
  "task": { "create": true, "read": true, "update": true, "delete": true },
  "member": { "invite": true, "remove": true, "role": true },
  "...": "..."
}
```

### 默认系统角色

| 角色 | 权限说明 |
|------|----------|
| OWNER | 项目所有者，拥有所有权限 |
| ADMIN | 项目管理员，可管理成员和配置 |
| MEMBER | 普通成员，可创建和管理任务 |
| VIEWER | 查看者，仅可读权限 |
| GUEST | 访客，有限的查看权限 |

## API 概览

### 认证接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/v1/auth/login | 用户登录 | 公开 |
| POST | /api/v1/auth/register | 用户注册 | 公开 |
| GET | /api/v1/auth/profile | 获取当前用户信息 | 登录用户 |

### 项目接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/projects | 获取项目列表 | 登录用户 |
| POST | /api/v1/projects | 创建项目 | 登录用户 |
| GET | /api/v1/projects/:id | 获取项目详情 | 项目成员 |
| PUT | /api/v1/projects/:id | 更新项目 | project.update |
| DELETE | /api/v1/projects/:id | 删除项目 | project.delete |
| POST | /api/v1/projects/:id/invite | 邀请成员 | member.invite |

### 任务接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/v1/tasks | 获取任务列表 | 项目成员 |
| POST | /api/v1/tasks | 创建任务 | task.create |
| GET | /api/v1/tasks/:id | 获取任务详情 | 项目成员 |
| PUT | /api/v1/tasks/:id | 更新任务 | task.update |
| PATCH | /api/v1/tasks/:id/status | 变更任务状态 | task.update |
| POST | /api/v1/tasks/:id/comments | 添加评论 | 项目成员 |

> 完整 API 文档请启动服务后访问 Swagger UI。

## 安全特性

1. **JWT 认证**：无状态身份认证，支持 Token 过期机制
2. **密码加密**：使用 bcrypt 进行密码哈希存储
3. **权限守卫**：细粒度的 RBAC 权限控制
4. **输入验证**：基于 class-validator 的请求参数校验
5. **限流保护**：基于 Throttler 的 API 限流
6. **安全头**：使用 Helmet 设置安全 HTTP 头
7. **CORS**：跨域资源共享配置
8. **操作日志**：全链路操作记录，支持审计追踪
9. **软删除**：核心数据支持软删除，保留历史记录

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 NestJS 模块化架构
- 使用 ESLint + Prettier 进行代码格式化
- 接口路径使用 kebab-case，变量使用 camelCase

### 命名约定

- 模块：`*.module.ts`
- 控制器：`*.controller.ts`
- 服务：`*.service.ts`
- DTO：`*.dto.ts`
- 守卫：`*.guard.ts`
- 装饰器：`*.decorator.ts`

### 提交规范

```
<type>(<scope>): <subject>

feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

## 部署

### Docker 部署

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "dist/main"]
```

### 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL 连接字符串 | - |
| JWT_SECRET | JWT 签名密钥 | - |
| JWT_EXPIRES_IN | Token 有效期 | 7d |
| APP_PORT | 服务端口 | 3000 |
| APP_HOST | 监听地址 | 0.0.0.0 |
| NODE_ENV | 运行环境 | development |
| UPLOAD_DIR | 文件上传目录 | ./uploads |
| MAX_FILE_SIZE | 最大文件大小（字节） | 10485760 |

## 测试账号

种子数据中包含以下测试账号：

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | Admin@123 | 系统管理员 |
| user1@example.com | User@123 | 普通用户 |
| user2@example.com | User@123 | 普通用户 |

## License

MIT
