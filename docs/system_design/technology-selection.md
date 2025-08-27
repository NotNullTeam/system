# 代码技术选型
> 开发时需要用到的框架、组件等
## 前端开发
| 模块 | 技术 | 用途 |
| ---- | -------- | -------- |
| 框架 | vue3 | 前端框架 |
| 语言 | Typescript | 强类型封装 |
| 通信 | fetch | 前端请求 |
| 界面组件 | AntD | UI库 |
| 工具链 | yarn | 依赖包管理 |
| 代码规范 | eslint | 前端代码规范统一 |

## 后端开发
| 模块 | 技术 | 用途 |
| ---- | -------- | -------- |
| 框架 | Python + flask | 后端web框架 |
| 存储 | SQLite | 轻量级本地数据库 |
| 任务队列 | ~~RQ~~ | ~~异步处理文档解析等耗时任务~~（已移除，改为同步处理） |
| 表单处理 | Flask-WTF | Web表单处理与验证 |
| 数据处理 | marshmallow | 数据序列化与反序列化 |
| 运行环境 | Docker | 容器化运行数据库等本地服务 |

## 模型应用与调优

| 技术栈 | 框架/库 | 作用 | 相关依赖 |
| --- | --- | --- | --- |
| **文档解析与切分** | 阿里云文档智能 (Document Mind) | 替代传统解析库，实现对复杂文档的细粒度解析和基于版面分析的语义切分 | `alibabacloud_tea_openapi`, `alibabacloud_docmind_api20220711==1.4.7`, `alibabacloud_credentials` |
| **AI服务统一集成** | Langchain | 统一集成所有AI服务（云端向量模型、大模型和本地重排序模型），提供一致的API接口 | `langchain`, `langchain-community`, `langchain_openai` |
| **工作流编排** | langgraph(langchain) | 编排RAG流程，管理prompt、模型和解析器。 | `langgraph`, `langchain` |
| **向量数据库** | Weaviate | 轻量级的本地向量数据库，通过 Docker 运行，用于本地开发与演示。 | `weaviate-client` |
| **向量化模型** | `text-embedding-v4` | 阿里云百炼平台提供的向量化模型，通过Langchain DashScope集成。 | `langchain-community`, `dashscope` |
| **重排序模型** | `Qwen3-Reranker` | 通过OLLAMA本地部署的重排序模型，使用Langchain集成。在召回阶段后，对候选文档进行精准排序。 | `ollama` (本地部署), `langchain-community` |
| **大语言模型** | qwen-plus | 阿里云百炼平台的高性能大模型，通过Langchain OpenAI兼容接口集成。 | `langchain_openai` |
| **可观测性** | LangSmith (可选) | 用于调试和监控复杂的LLM应用（如Agent）。 | `langsmith` |


<br><br/>
<br><br/>
<br><br/>

# 本地化开发技术选型
> 旨在通过本地化部署大部分基础设施，实现一个可离线运行、便于开发与演示的RAG问答系统。

## 核心思路

我们的目标是使用`Docker`容器化运行的开源软件，替代大部分非必要的云服务，仅保留核心的、难以本地部署的AI能力（文档智能、大小模型）在云端。这使得项目能在普通开发笔记本上稳定运行，同时保持了关键功能的先进性。

## 本地化部署方案

下表将本项目的技术组件与推荐的本地化方案进行对应：

| 组件类别 | 原云服务方案 | 本地化部署方案 | 备注 |
| :--- | :--- | :--- | :--- |
| **前端部署** | 阿里云 OSS | **本地开发服务器** | 使用 `vite` 或 `webpack-dev-server` 在本地运行前端应用。 |
| **后端服务** | 函数计算 FC | **本地运行 Flask 服务** | Flask 应用本身即可在本地直接启动，负责处理所有 API 请求。 |
| **文档解析处理** | 阿里云文档智能 (Document Mind) | **保留云服务** | 这是项目的核心优势之一，本地库难以实现同等级的版面分析与语义切分。 |
| **大模型推理** | 阿里云百炼 | **保留云服务** | 通过Langchain OpenAI兼容接口调用`qwen-plus`模型，统一AI服务集成方式。 |
| **向量模型** | 阿里云百炼平台 | **保留云服务** | 使用`text-embedding-v4`模型，通过Langchain DashScope集成，确保与线上环境一致。 |
| **重排序模型** | OLLAMA | **本地部署** | 使用`Qwen3-Reranker`模型，通过OLLAMA在本地部署，使用Langchain集成提供统一接口。 |
| **向量存储** | OpenSearch | **Weaviate (Docker)** | 轻量、高效的开源向量数据库，支持本地部署。 |
| **知识库存储** | 阿里云 OSS | **本地文件系统** | 将所有上传的原始文档、附件等直接存储在本地磁盘的指定目录中。 |
| **用户数据库** | SQLite | **SQLite (文件存储)** | 使用本地文件形式存储，零配置且便于管理。 |
| **AI工作流编排** | langgraph(langchain) | 不变 | - | 在本地运行的 Flask 应用中执行 Python 代码即可。 |
| **异步任务处理** | (原为FC隐式处理) | ~~**RQ (Python库)**~~ | ~~用于处理文档解析、向量化等耗时任务，避免阻塞API主线程。~~（已移除，改为同步处理） |

## 实施指南

关于本地化环境的详细配置、启动步骤，请参阅项目统一的开发执行总纲：

**[项目开发链路与里程碑](../project_management/development-workflow.md)**
