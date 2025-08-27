"""
IP智慧解答专家系统 - 任务队列服务

本模块提供基于线程池的异步任务处理功能，无需外部依赖。
使用ThreadPoolExecutor实现真正的异步执行，避免阻塞Web请求。
"""

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Optional, Any, Callable, Dict
from datetime import datetime
from flask import current_app

logger = logging.getLogger(__name__)


class TaskJob:
    """任务对象，跟踪任务状态和结果"""
    
    def __init__(self, job_id: str, future: Future, func_name: str):
        self.id = job_id
        self.future = future
        self.func_name = func_name
        self.created_at = datetime.now()
        self.started_at = None
        self.completed_at = None
        
    def get_status(self) -> str:
        """获取任务状态"""
        if self.future.cancelled():
            return 'cancelled'
        elif self.future.done():
            if self.future.exception():
                return 'failed'
            else:
                return 'finished'
        elif self.started_at:
            return 'started'
        else:
            return 'queued'
    
    def get_result(self) -> Any:
        """获取任务结果"""
        if self.future.done() and not self.future.exception():
            return self.future.result()
        return None
    
    def get_error(self) -> str:
        """获取错误信息"""
        if self.future.done() and self.future.exception():
            return str(self.future.exception())
        return None


class ThreadPoolQueue:
    """基于线程池的任务队列"""
    
    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix='TaskWorker')
        self.jobs: Dict[str, TaskJob] = {}
        self.lock = threading.Lock()
        logger.info(f"线程池任务队列初始化完成，最大工作线程数: {max_workers}")
    
    def enqueue(self, func: Callable, *args, **kwargs) -> TaskJob:
        """提交任务到线程池"""
        job_id = kwargs.pop('job_id', f'task_{int(time.time() * 1000)}')
        job_timeout = kwargs.pop('job_timeout', None)  # 暂时忽略超时设置
        
        def wrapped_func():
            """包装函数，用于记录执行时间和处理异常"""
            try:
                with self.lock:
                    if job_id in self.jobs:
                        self.jobs[job_id].started_at = datetime.now()
                
                logger.info(f"开始执行任务: {func.__name__} (ID: {job_id})")
                result = func(*args)
                
                with self.lock:
                    if job_id in self.jobs:
                        self.jobs[job_id].completed_at = datetime.now()
                
                logger.info(f"任务执行完成: {func.__name__} (ID: {job_id})")
                return result
                
            except Exception as e:
                logger.error(f"任务执行失败: {func.__name__} (ID: {job_id}), 错误: {str(e)}")
                with self.lock:
                    if job_id in self.jobs:
                        self.jobs[job_id].completed_at = datetime.now()
                raise
        
        # 提交到线程池
        future = self.executor.submit(wrapped_func)
        
        # 创建任务对象
        job = TaskJob(job_id, future, func.__name__)
        
        with self.lock:
            self.jobs[job_id] = job
        
        logger.info(f"任务已提交到线程池: {func.__name__} (ID: {job_id})")
        return job
    
    def get_job(self, job_id: str) -> Optional[TaskJob]:
        """获取任务对象"""
        with self.lock:
            return self.jobs.get(job_id)
    
    def cleanup_completed_jobs(self, max_age_hours: int = 24):
        """清理已完成的旧任务"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        
        with self.lock:
            to_remove = []
            for job_id, job in self.jobs.items():
                if (job.completed_at and 
                    job.completed_at.timestamp() < cutoff_time):
                    to_remove.append(job_id)
            
            for job_id in to_remove:
                del self.jobs[job_id]
            
            if to_remove:
                logger.info(f"清理了 {len(to_remove)} 个已完成的旧任务")


# 全局线程池队列实例
_thread_pool_queue = None
_queue_lock = threading.Lock()


def get_task_queue():
    """
    获取任务队列实例（线程池实现）
    
    Returns:
        ThreadPoolQueue: 线程池队列实例
    """
    global _thread_pool_queue
    
    with _queue_lock:
        if _thread_pool_queue is None:
            max_workers = current_app.config.get('TASK_QUEUE_MAX_WORKERS', 4)
            _thread_pool_queue = ThreadPoolQueue(max_workers=max_workers)
        
        return _thread_pool_queue


def get_task_status(job_id: str) -> dict:
    """
    获取任务状态
    
    Args:
        job_id: 任务ID
        
    Returns:
        dict: 任务状态信息
    """
    try:
        queue = get_task_queue()
        job = queue.get_job(job_id)
        
        if not job:
            return {
                'id': job_id,
                'status': 'not_found',
                'result': None,
                'error': 'Job not found'
            }
        
        return {
            'id': job.id,
            'status': job.get_status(),
            'result': job.get_result(),
            'error': job.get_error(),
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None
        }
        
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}")
        return {
            'id': job_id,
            'status': 'error',
            'result': None,
            'error': str(e)
        }


def is_queue_available() -> bool:
    """
    检查任务队列是否可用
    
    Returns:
        bool: 队列是否可用（线程池总是可用）
    """
    return True


def cleanup_old_tasks():
    """清理旧任务（可以定期调用）"""
    try:
        queue = get_task_queue()
        queue.cleanup_completed_jobs()
    except Exception as e:
        logger.error(f"清理旧任务失败: {str(e)}")
