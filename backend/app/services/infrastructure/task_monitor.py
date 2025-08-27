"""
IP智慧解答专家系统 - 任务监控器

本模块提供基础的任务监控功能（已移除 RQ 依赖）。
"""

import logging
import traceback
import time
from functools import wraps
from typing import Any, Callable, Dict, Optional
from flask import current_app

logger = logging.getLogger(__name__)


class TaskMonitor:
    """任务监控器"""

    @staticmethod
    def monitor_task_progress(func: Callable) -> Callable:
        """
        任务进度监控装饰器（简化版本，无 RQ 依赖）

        Args:
            func: 要监控的任务函数

        Returns:
            Callable: 包装后的函数
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            task_name = func.__name__
            logger.info(f"任务开始执行: {task_name}")

            try:
                # 执行原始函数
                result = func(*args, **kwargs)
                logger.info(f"任务执行成功: {task_name}")
                return result

            except Exception as e:
                logger.error(f"任务执行失败: {task_name} - {str(e)}")
                logger.error(f"错误堆栈: {traceback.format_exc()}")
                raise

        return wrapper

    @staticmethod
    def retry_on_failure(max_retries: int = 3, retry_intervals: list = None) -> Callable:
        """
        失败重试装饰器（简化版本，无 RQ 依赖）

        Args:
            max_retries: 最大重试次数
            retry_intervals: 重试间隔时间列表（秒）

        Returns:
            Callable: 装饰器函数
        """
        if retry_intervals is None:
            retry_intervals = [10, 30, 60]  # 默认重试间隔

        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                last_exception = None
                
                for attempt in range(max_retries + 1):
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        last_exception = e
                        if attempt < max_retries:
                            interval_index = min(attempt, len(retry_intervals) - 1)
                            retry_interval = retry_intervals[interval_index]
                            
                            logger.warning(
                                f"任务执行失败，将在 {retry_interval} 秒后重试 "
                                f"(第 {attempt + 1}/{max_retries} 次重试): {str(e)}"
                            )
                            time.sleep(retry_interval)
                        else:
                            logger.error(f"任务最终失败，已达到最大重试次数: {str(e)}")
                            raise last_exception

            return wrapper
        return decorator


# 便捷的装饰器函数
def monitor_progress(func):
    """进度监控装饰器（便捷函数）"""
    return TaskMonitor.monitor_task_progress(func)


def retry_on_failure(max_retries: int = 3, retry_intervals: list = None):
    """重试装饰器（便捷函数）"""
    return TaskMonitor.retry_on_failure(max_retries, retry_intervals)


def with_monitoring_and_retry(max_retries: int = 3, retry_intervals: list = None):
    """
    组合装饰器：同时添加监控和重试功能

    Args:
        max_retries: 最大重试次数
        retry_intervals: 重试间隔时间列表

    Returns:
        Callable: 装饰器函数
    """
    def decorator(func):
        # 先应用重试装饰器，再应用监控装饰器
        func = retry_on_failure(max_retries, retry_intervals)(func)
        func = monitor_progress(func)
        return func
    return decorator
