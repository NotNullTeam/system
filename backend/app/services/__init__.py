"""
IP智慧解答专家系统 - 服务模块

本模块提供各种业务服务的实现，按功能分类组织：

- ai: AI相关服务（LLM、嵌入、Agent）
- document: 文档处理服务（解析、分割、IDP）
- storage: 存储服务（缓存、向量数据库）
- retrieval: 检索服务（向量检索、混合检索）
- infrastructure: 基础设施服务（任务监控、队列）
"""

# 基础服务已移除 RQ 依赖

# 导入各模块的公共接口
from .ai import *
from .document import *
from .storage import *
from .retrieval import *
from .infrastructure import *
