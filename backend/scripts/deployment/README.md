# 部署脚本

本目录包含生产环境部署和服务管理相关的脚本。

## 脚本说明

### `setup_env.py` - 生成本地环境文件
生成 `backend/.env`，并随机写入 `SECRET_KEY`、`JWT_SECRET_KEY`（不依赖 `.env.example`）。
也可使用 `.env.example` 手动复制并填写配置。

```bash
python scripts/deployment/setup_env.py
```

手动方式（可选）：

```bash
# 在 backend/ 目录下执行
# Linux/Mac
cp .env.example .env
# Windows (PowerShell/CMD)
copy .env.example .env
```

### `start_weaviate.py` - Weaviate 向量数据库启动脚本
独立启动/调试 Weaviate（通常由 docker-compose 管理）。

```bash
python scripts/deployment/start_weaviate.py
```

### 异步任务处理说明
RQ异步任务依赖已被移除，系统现在使用同步处理方式。不再需要启动Worker进程。

> 实际生产推荐使用 `docker compose up`，后端、Redis、Weaviate 均由 `docker-compose.yml` 协调启动。

## 部署流程

1. 确保Redis服务运行正常
2. 启动Weaviate向量数据库
3. 运行数据库初始化脚本
4. 启动主应用服务（RQ Worker已移除）

## 生产环境注意事项

- 确保所有服务的配置文件正确
- 监控服务运行状态和资源使用情况
- 定期备份重要数据
- 配置适当的日志级别和轮转策略
