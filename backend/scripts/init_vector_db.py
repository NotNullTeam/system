#!/usr/bin/env python3
"""
向量数据库初始化脚本
"""

import sys
import os
import requests
import json

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.services.retrieval.vector_service import get_vector_service

def init_vector_database_direct():
    """直接通过服务初始化向量数据库"""
    print("🔧 正在初始化向量数据库...")
    
    app = create_app()
    
    with app.app_context():
        try:
            # 获取向量服务
            vector_service = get_vector_service()
            
            # 清空向量数据库
            success = vector_service.vector_db.clear_all_data()
            
            if success:
                print("✅ 向量数据库已成功初始化为初始状态")
                
                # 获取统计信息确认
                stats = vector_service.vector_db.get_stats()
                print(f"📊 数据库统计信息:")
                print(f"   - 总文档数: {stats.get('total_documents', 0)}")
                print(f"   - 集合名称: {stats.get('collection_name', 'N/A')}")
                print(f"   - 状态: {stats.get('status', 'N/A')}")
                print(f"   - 数据库类型: {stats.get('db_type', 'N/A')}")
                
                return True
            else:
                print("❌ 向量数据库初始化失败")
                return False
                
        except Exception as e:
            print(f"❌ 向量数据库初始化过程中发生错误: {str(e)}")
            return False

def init_vector_database_api():
    """通过API初始化向量数据库"""
    print("🔧 正在通过API初始化向量数据库...")
    
    base_url = "http://127.0.0.1:5001"
    
    try:
        # 1. 登录获取token
        login_data = {
            "username": "12403010122",
            "password": "admin"
        }
        
        login_response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            print(f"❌ 登录失败: {login_response.text}")
            return False
            
        token = login_response.json()["data"]["access_token"]
        print("✅ 登录成功")
        
        # 2. 调用向量数据库初始化API
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        init_response = requests.post(
            f"{base_url}/api/v1/system/vector-db/initialize",
            headers=headers
        )
        
        if init_response.status_code == 200:
            result = init_response.json()
            print("✅ 向量数据库初始化成功")
            print(f"📝 {result['data']['message']}")
            
            # 3. 获取统计信息确认
            stats_response = requests.get(
                f"{base_url}/api/v1/system/vector-db/stats",
                headers=headers
            )
            
            if stats_response.status_code == 200:
                stats = stats_response.json()["data"]
                print(f"📊 数据库统计信息:")
                print(f"   - 总文档数: {stats.get('total_documents', 0)}")
                print(f"   - 集合名称: {stats.get('collection_name', 'N/A')}")
                print(f"   - 状态: {stats.get('status', 'N/A')}")
                print(f"   - 数据库类型: {stats.get('db_type', 'N/A')}")
            
            return True
        else:
            print(f"❌ 向量数据库初始化失败: {init_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保后端服务正在运行")
        return False
    except Exception as e:
        print(f"❌ API调用过程中发生错误: {str(e)}")
        return False

if __name__ == '__main__':
    print("🚀 向量数据库初始化工具")
    print("=" * 50)
    
    # 首先尝试直接调用服务
    print("\n方法1: 直接调用服务")
    if init_vector_database_direct():
        print("\n🎉 向量数据库初始化完成！")
        sys.exit(0)
    
    # 如果直接调用失败，尝试API调用
    print("\n方法2: 通过API调用")
    if init_vector_database_api():
        print("\n🎉 向量数据库初始化完成！")
        sys.exit(0)
    
    print("\n❌ 向量数据库初始化失败！")
    sys.exit(1)
