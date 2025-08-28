# IP 智慧解答专家系统

基于RAG与大小模型协同的数通知识问答系统，融合前端React应用与Python Flask后端。

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 快速启动

#### 方式一：分别启动（推荐）
```bash
# 启动后端
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py (初始环境下选择y以初始化数据库)

# 启动前端（新终端）
cd ..
npm install
npm run dev
```

默认管理员账号：`12403010122` / `admin`

#### 方式二：Docker Compose（未测试，大概率会出现问题）
```bash
# 1. 生成后端环境配置
cd backend
python scripts/deployment/setup_env.py

# 2. 启动完整系统（前端 + 后端 + 数据库）
cd ..
docker compose up -d --build

# 3. 访问应用
# 前端：http://localhost:5173
# 后端API：http://localhost:5001
# API文档：http://localhost:5001/api/v1/docs/
```

## 技术架构

### 前端技术栈
- **React 18** - UI 框架
- **Vite** - 构建工具
- **React Router 6** - 路由管理
- **Axios** - HTTP 客户端
- **Tailwind CSS** - 样式框架
- **Ant Design** - UI组件库

### 后端技术栈
- **Python 3.8+** - 编程语言
- **Flask** - Web框架
- **SQLite** - 轻量级数据库
- **Weaviate** - 向量数据库
- **Redis** - 缓存与任务队列

### AI服务集成
- **阿里云百炼** - qwen-plus大语言模型
- **text-embedding-v4** - 向量化模型
- **Document Mind** - 智能文档解析
- **OLLAMA** - 本地Qwen3-Reranker重排序
- **Langchain** - AI服务统一集成
- **langgraph** - 多轮对话工作流

### 项目结构
```
system/
├── src/                    # 前端源码
│   ├── api/               # API 客户端
│   ├── components/        # 公共组件
│   ├── contexts/          # React Context
│   ├── pages/             # 页面组件
│   ├── App.jsx            # 应用根组件
│   └── main.jsx           # 应用入口
├── backend/               # 后端源码
│   ├── app/               # Flask应用
│   │   ├── api/           # API蓝图
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 业务服务
│   │   └── utils/         # 工具函数
│   ├── config/            # 配置文件
│   ├── migrations/        # 数据库迁移
│   ├── scripts/           # 管理脚本
│   ├── tests/             # 测试代码
│   ├── run.py             # 应用启动入口
│   └── requirements.txt   # Python依赖
├── public/                # 静态资源
├── index.html             # HTML入口
├── package.json           # 前端依赖配置
├── vite.config.js         # Vite配置
├── tailwind.config.js     # Tailwind配置
├── docker-compose.yml     # Docker编排
└── README.md              # 项目文档
```
