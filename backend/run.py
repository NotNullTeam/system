"""
IP智慧解答专家系统 - 应用启动文件

本文件用于启动Flask开发服务器。
"""

import os
import sys
import subprocess
import time
import shutil
import threading
import atexit
from urllib.parse import urlparse
import redis
from config.settings import Config
from app import create_app, db
from app.models.user import User
from app.models.case import Case, Node, Edge
from app.models.knowledge import KnowledgeDocument, ParsingJob
from app.models.feedback import Feedback

def register_shell_context(app):
    @app.shell_context_processor
    def make_shell_context():
        return {
            'db': db,
            'User': User,
            'Case': Case,
            'Node': Node,
            'Edge': Edge,
            'KnowledgeDocument': KnowledgeDocument,
            'ParsingJob': ParsingJob,
            'Feedback': Feedback
        }

# Redis/Docker检查
def _is_local_redis(url: str) -> bool:
    """判断 REDIS_URL 是否指向本机"""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or 'localhost'
        return host in ('localhost', '127.0.0.1')
    except Exception:
        return True


def _docker_available() -> bool:
    """检查 docker CLI 与 daemon 是否可用"""
    if shutil.which('docker') is None:
        return False
    try:
        result = subprocess.run(['docker', 'info'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return result.returncode == 0
    except Exception:
        return False


def _try_start_docker_desktop() -> None:
    """在 Windows 上尝试启动 Docker Desktop（若未运行）"""
    try:
        if os.name != 'nt':
            return
        candidates = [
            r"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'Docker', 'Docker', 'Docker Desktop.exe'),
        ]
        for exe in candidates:
            if exe and os.path.exists(exe):
                try:
                    # 后台启动，不阻塞
                    subprocess.Popen([exe], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    print('⏳ 正在尝试启动 Docker Desktop...')
                    return
                except Exception:
                    pass
        # 兜底尝试使用 PowerShell 启动
        subprocess.run(['powershell', '-NoProfile', '-Command',
                        "Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print('⏳ 正在尝试通过 PowerShell 启动 Docker Desktop...')
    except Exception:
        pass


def _ensure_docker_running() -> bool:
    """确保 Docker daemon 已运行；必要时在 Windows 上尝试启动 Docker Desktop 并等待就绪"""
    if _docker_available():
        return True
    print('❌ 检测到 Docker 未运行，尝试启动 Docker Desktop...')
    _try_start_docker_desktop()

    # 等待 Docker 就绪
    total = int(os.environ.get('DOCKER_STARTUP_TIMEOUT', '60'))
    interval = 2
    waited = 0
    while waited < total:
        if _docker_available():
            print('✅ Docker 已就绪')
            return True
        time.sleep(interval)
        waited += interval
        print(f'... 等待 Docker 启动中 ({waited}/{total}s)')
    return _docker_available()


def _docker_resource_exists(kind: str, name: str) -> bool:
    """检查 docker 资源是否存在 (container/volume)"""
    try:
        if kind == 'container':
            # 返回容器ID则存在
            r = subprocess.run(['docker', 'ps', '-a', '--filter', f'name=^{name}$', '--format', '{{.ID}}'], capture_output=True, text=True)
            return r.returncode == 0 and r.stdout.strip() != ''
        elif kind == 'volume':
            r = subprocess.run(['docker', 'volume', 'inspect', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return r.returncode == 0
    except Exception:
        pass
    return False


def _docker_container_running(name: str) -> bool:
    try:
        r = subprocess.run(['docker', 'inspect', '-f', '{{.State.Running}}', name], capture_output=True, text=True)
        return r.returncode == 0 and r.stdout.strip().lower() == 'true'
    except Exception:
        return False


def _ensure_docker_compose_services() -> None:
    """确保 docker-compose 服务运行"""
    auto_manage = os.environ.get('AUTO_MANAGE_WEAVIATE', 'true').lower() in ('1', 'true', 'yes', 'y')
    if not auto_manage:
        print('ℹ️  已禁用自动管理容器服务')
        return

    # 检查所有核心服务是否运行
    services_status = {
        'weaviate': _docker_container_running('backend-weaviate'),
        'redis': _docker_container_running('backend-redis'),
        'ollama': _docker_container_running('backend-ollama')
    }
    
    missing_services = [name for name, running in services_status.items() if not running]
    
    if not missing_services:
        print('✅ 所有Docker Compose服务已运行')
    else:
        print(f'🚀 启动缺失的服务: {", ".join(missing_services)}...')
        try:
            # 启动所有核心服务
            subprocess.run(['docker-compose', 'up', '-d', 'weaviate', 'redis', 'ollama'], 
                         check=True, stdout=subprocess.DEVNULL, cwd=os.path.dirname(__file__))
            print('✅ Docker Compose 服务启动成功')
        except subprocess.CalledProcessError as e:
            print(f'❌ 启动 Docker Compose 服务失败: {e}')
            return

    # 等待 Weaviate 就绪
    print('⏳ 等待 Weaviate 服务就绪...')
    for i in range(30):  # 最多等待30秒
        try:
            import requests
            response = requests.get('http://localhost:8080/v1/.well-known/ready', timeout=2)
            if response.status_code == 200:
                print('✅ Weaviate 服务已就绪')
                break
        except:
            pass
        time.sleep(1)
    else:
        print('⚠️  Weaviate 服务可能需要更多时间启动')
    
    # 等待 Ollama 就绪
    print('⏳ 等待 Ollama 服务就绪...')
    for i in range(30):  # 最多等待30秒
        try:
            import requests
            response = requests.get('http://localhost:11434/api/tags', timeout=2)
            if response.status_code == 200:
                print('✅ Ollama 服务已就绪')
                break
        except:
            pass
        time.sleep(1)
    else:
        print('⚠️  Ollama 服务可能需要更多时间启动')


def _ensure_redis_container(app_redis_url: str) -> None:
    """确保本机 Redis 容器存在并已运行（通过 docker-compose）"""
    if not _is_local_redis(app_redis_url):
        print('ℹ️  检测到 REDIS_URL 非本机地址，跳过 Docker 容器管理')
        return

    auto_manage = os.environ.get('AUTO_MANAGE_REDIS', 'true').lower() in ('1', 'true', 'yes', 'y')
    if not auto_manage:
        print('ℹ️  已禁用自动管理 Redis（AUTO_MANAGE_REDIS=false）')
        return

    if not _ensure_docker_running():
        print('⚠️  Docker 未就绪，跳过自动创建/启动 Redis 容器')
        return

    # 检查 backend-redis 容器是否运行
    if _docker_container_running('backend-redis'):
        print('✅ Redis 容器已运行')
        return
    
    # 通过 docker-compose 启动 Redis
    print('🚀 通过 docker-compose 启动 Redis...')
    try:
        subprocess.run(['docker-compose', 'up', '-d', 'redis'], 
                     check=True, stdout=subprocess.DEVNULL, cwd=os.path.dirname(__file__))
        print('✅ Redis 容器启动成功')
    except subprocess.CalledProcessError as e:
        print(f'❌ 启动 Redis 容器失败: {e}')


def ensure_redis_ready(redis_url: str) -> None:
    """确保 Redis 可用：若不可用则尝试自动拉起 Docker 容器并重试连接"""

    # 允许通过环境变量快速关闭此检查（兼容用户脚本变量名）
    enable_check = os.environ.get('ENABLE_REDIS_CHECK', os.environ.get('AUTO_MANAGE_REDIS', 'true'))
    if str(enable_check).lower() not in ('1', 'true', 'yes', 'y'):
        print('⚠️  ENABLE_REDIS_CHECK/AUTO_MANAGE_REDIS 未开启，跳过 Redis 可用性检查')
        return

    # 初次快速探测
    try:
        client = redis.from_url(redis_url, socket_connect_timeout=1)
        client.ping()
        print('✅ Redis 连接正常')
        return
    except Exception:
        print('ℹ️  检测到 Redis 未就绪，尝试自动启动（如可用）...')

    # 尝试拉起 Docker 容器
    _ensure_redis_container(redis_url)

    # 重试等待Redis就绪
    max_wait = int(os.environ.get('REDIS_WAIT_TIMEOUT', '60'))  # 秒
    interval = 1
    deadline = time.time() + max_wait
    last_err = None
    while time.time() < deadline:
        try:
            client = redis.from_url(redis_url, socket_connect_timeout=1)
            client.ping()
            print('✅ Redis 已就绪')
            return
        except Exception as e:
            last_err = e
            time.sleep(interval)

    print(f'⚠️  Redis 仍不可用: {last_err}')

def check_database_initialized():
    """检查数据库是否已初始化"""
    with app.app_context():
        try:
            # 确保instance目录存在
            instance_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
            os.makedirs(instance_dir, exist_ok=True)

            # 尝试创建表（如果不存在）
            db.create_all()

            # 检查是否有默认用户
            if User.query.first() is None:
                print("\n⚠️  检测到数据库未初始化（无默认用户）")
                return False
            return True
        except Exception as e:
            print(f"\n⚠️  数据库初始化失败: {str(e)}")
            print("请检查数据库配置或运行: python scripts/manage.py init")
            return False


if __name__ == '__main__':
    # 1) 读取 REDIS_URL（优先环境变量，其次配置默认）
    redis_url = os.environ.get('REDIS_URL') or Config.REDIS_URL

    # 2) 在创建 Flask 应用之前，确保 Docker 服务就绪
    if _docker_available() or _ensure_docker_running():
        print('🐳 Docker 服务可用，启动相关容器...')
        _ensure_docker_compose_services()
        ensure_redis_ready(redis_url)
    else:
        print('⚠️  Docker 不可用，将使用模拟服务')
        ensure_redis_ready(redis_url)

    # 3) 创建应用并注册 shell 上下文
    app = create_app()
    register_shell_context(app)
    
    # 4) 在主线程中预初始化IDP服务，避免子线程signal错误
    with app.app_context():
        from app.services.document.idp_service import init_idp_service
        init_idp_service()

    # 5) 检查数据库初始化状态（可选）
    if not check_database_initialized():
        print("\n是否现在运行数据库初始化脚本 (python scripts/manage.py init)？(Y/n): ", end="")
        choice = input().strip().lower()
        if choice in ['', 'y', 'yes']:
            try:
                print("\n🔧 正在执行: python scripts/manage.py init ...")
                manage_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts', 'manage.py')
                subprocess.check_call([sys.executable, manage_script, 'init'])
            except Exception as e:
                print(f"\n❌ 初始化脚本执行失败: {e}")
                print("\n是否继续启动服务？(y/N): ", end="")
                if input().lower() != 'y':
                    exit(1)
            # 重新检查初始化状态
            if not check_database_initialized():
                print("\n❌ 数据库仍未初始化。是否继续启动服务？(y/N): ", end="")
                if input().lower() != 'y':
                    exit(1)
        else:
            print("\n是否继续启动服务？(y/N): ", end="")
            if input().lower() != 'y':
                exit(1)

    # 6) 开发环境启动配置
    print("\n🚀 启动系统...")
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )
