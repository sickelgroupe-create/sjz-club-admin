# sjz-club-admin · 俱乐部管理后台

Vue 3 / Vite 管理后台，与后端及小程序组成完整业务系统。

## 配套仓库

- 后端：https://github.com/sickelgroupe-create/sjz-club-backend
- 小程序：https://github.com/sickelgroupe-create/sjz-club-app
- 原三端源码快照：https://github.com/sickelgroupe-create/sjz-club

## 开发与构建

复制 `.env.example` 为 `.env.development`，运行 `npm ci` 和 `npm run dev`。开发接口使用 `/dev-api`，代理目标见 vite.config.js，默认为本机后端。

生产构建前配置自己的 `.env.production`，确保 API 路径与反向代理一致，再运行 `npm run build:prod`。不要将生产密钥放入 VITE_ 变量，这些变量会进入浏览器代码。

登录表单预填凭据已清空，使用自己后端创建的账号。旧 sandbox 命令依赖未导出的历史配置，不作为有效启动入口。

## 范围

统一目录、克隆和分支协作见 [CONTRIBUTING.md](CONTRIBUTING.md)。本机旧配置只保留在 Git 忽略的 `local-private/` 中，不自动加载；新同事使用 `.env.example` 配置自己的开发环境。

从已清理的三端源码快照拆分，不含依赖缓存、旧 Git 历史、用户资料及线上凭据。未变更线上服务或部署配置。原开源 LICENSE 保留，业务代码未新增开源授权，仓库保持私有。
