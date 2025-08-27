#!/usr/bin/env python3
"""
IP智慧解答专家系统 - 项目管理脚本

提供项目初始化、数据库管理、开发工具等功能的统一入口。
"""

import sys
import os
import argparse

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User


def init_database():
    """初始化数据库"""
    app = create_app()
    
    with app.app_context():
        print("🔧 正在初始化数据库...")
        # 确保 instance 目录存在（SQLite 需要路径存在）
        basedir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        instance_dir = os.path.join(basedir, 'instance')
        os.makedirs(instance_dir, exist_ok=True)

        # 创建所有表
        db.create_all()
        print("✅ 数据库表创建成功！")
        
        # 创建默认用户（公司派发测试账号）
        if User.query.first() is None:
            default_user = User(
                username='12403010122',
                email='12403010122@example.com',
                roles='admin,user',
                employee_id='12403010122',
                full_name='张艺',
                gender='male',
                department='运维部'
            )
            default_user.set_password('admin')

            db.session.add(default_user)
            db.session.commit()

            print("✅ 默认测试账号创建成功！")
            print("   账号(用户名/工号): 12403010122")
            print("   密码: admin")
        else:
            print("ℹ️  用户已存在，跳过默认用户创建")
        
        print("🎉 数据库初始化完成！")


def reset_database():
    """重置数据库"""
    app = create_app()
    
    with app.app_context():
        print("⚠️  正在重置数据库...")
        db.drop_all()
        print("🗑️  已删除所有表")
        
        init_database()


def check_environment():
    """检查开发环境"""
    print("🔍 检查开发环境...")
    
    # 检查Python版本
    print(f"Python版本: {sys.version}")
    
    # 检查必要的包
    try:
        import flask
        print(f"✅ Flask: {flask.__version__}")
    except ImportError:
        print("❌ Flask未安装")
    
    try:
        import sqlalchemy
        print(f"✅ SQLAlchemy: {sqlalchemy.__version__}")
    except ImportError:
        print("❌ SQLAlchemy未安装")
    
    # 检查数据库连接
    try:
        app = create_app()
        with app.app_context():
            db.engine.execute('SELECT 1')
        print("✅ 数据库连接正常")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")


def main():
    parser = argparse.ArgumentParser(description='IP智慧解答专家系统管理工具')
    parser.add_argument('command', choices=['init', 'reset', 'check'], 
                       help='要执行的命令')
    
    args = parser.parse_args()
    
    if args.command == 'init':
        init_database()
    elif args.command == 'reset':
        confirm = input("确定要重置数据库吗？这将删除所有数据！(yes/no): ")
        if confirm.lower() == 'yes':
            reset_database()
        else:
            print("操作已取消")
    elif args.command == 'check':
        check_environment()


if __name__ == '__main__':
    main()
