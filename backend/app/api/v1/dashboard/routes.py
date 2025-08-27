"""
Dashboard API路由
"""

from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.dashboard import dashboard_bp as bp
from app.models.case import Case
from app.models.knowledge import KnowledgeDocument
from app import db
from datetime import datetime, timedelta
from sqlalchemy import func, and_


@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_system_stats():
    """获取系统统计信息"""
    try:
        user_id = get_jwt_identity()
        
        # 获取用户的案例统计
        total_cases = Case.query.filter_by(user_id=int(user_id)).count()
        active_cases = Case.query.filter(
            and_(Case.user_id == int(user_id), Case.status.in_(['open', 'in_progress']))
        ).count()
        resolved_cases = Case.query.filter(
            and_(Case.user_id == int(user_id), Case.status == 'resolved')
        ).count()
        
        # 获取知识库统计
        total_docs = KnowledgeDocument.query.filter_by(
            user_id=int(user_id), 
            is_deleted=False
        ).count()
        
        return jsonify({
            'code': 200,
            'status': 'success',
            'data': {
                'cases': {
                    'total': total_cases,
                    'active': active_cases,
                    'resolved': resolved_cases
                },
                'documents': {
                    'total': total_docs
                },
                'system': {
                    'uptime': '99.9%',
                    'version': '1.0.0'
                }
            }
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'status': 'error',
            'error': {
                'type': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500


@bp.route('/fault-categories', methods=['GET'])
@jwt_required()
def get_fault_categories():
    """获取故障类别统计"""
    try:
        user_id = get_jwt_identity()
        
        # 查询用户的案例按类别统计
        categories_query = db.session.query(
            func.coalesce(Case.category, '未分类').label('category'),
            func.count(Case.id).label('count')
        ).filter(
            Case.user_id == int(user_id)
        ).group_by(func.coalesce(Case.category, '未分类')).all()
        
        total = sum(cat.count for cat in categories_query)
        
        categories = []
        for cat in categories_query:
            category_name = cat.category or '未分类'
            count = cat.count
            percentage = round((count / total * 100) if total > 0 else 0, 1)
            
            categories.append({
                'name': category_name,
                'count': count,
                'value': count,
                'percentage': percentage
            })
        
        return jsonify({
            'code': 200,
            'status': 'success',
            'data': {
                'categories': categories,
                'total': total
            }
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'status': 'error',
            'error': {
                'type': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500


@bp.route('/trends', methods=['GET'])
@jwt_required()
def get_trends():
    """获取趋势数据"""
    try:
        user_id = get_jwt_identity()
        range_param = request.args.get('range', 'month')
        
        # 根据范围计算日期
        if range_param == 'week':
            start_date = datetime.now() - timedelta(days=7)
            date_format = '%Y-%m-%d'
        elif range_param == 'year':
            start_date = datetime.now() - timedelta(days=365)
            date_format = '%Y-%m'
        else:  # month
            start_date = datetime.now() - timedelta(days=30)
            date_format = '%Y-%m-%d'
        
        # 查询趋势数据
        trends_query = db.session.query(
            func.date(Case.created_at).label('date'),
            func.count(Case.id).label('count')
        ).filter(
            and_(
                Case.user_id == int(user_id),
                Case.created_at >= start_date
            )
        ).group_by(func.date(Case.created_at)).order_by('date').all()
        
        trends = []
        for trend in trends_query:
            trends.append({
                'date': trend.date.strftime(date_format),
                'count': trend.count
            })
        
        return jsonify({
            'code': 200,
            'status': 'success',
            'data': {
                'trends': trends,
                'range': range_param
            }
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'status': 'error',
            'error': {
                'type': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500


@bp.route('/timeline', methods=['GET'])
@jwt_required()
def get_timeline():
    """获取时间线数据"""
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        # 获取最近的案例活动
        recent_cases = Case.query.filter_by(
            user_id=int(user_id)
        ).order_by(Case.updated_at.desc()).limit(limit).all()
        
        timeline = []
        for case in recent_cases:
            timeline.append({
                'id': case.id,
                'title': case.title,
                'description': case.description[:100] + '...' if len(case.description) > 100 else case.description,
                'status': case.status,
                'category': case.category,
                'created_at': case.created_at.isoformat() + 'Z' if case.created_at else None,
                'updated_at': case.updated_at.isoformat() + 'Z' if case.updated_at else None
            })
        
        return jsonify({
            'code': 200,
            'status': 'success',
            'data': {
                'timeline': timeline,
                'total': len(timeline)
            }
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'status': 'error',
            'error': {
                'type': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500


@bp.route('/coverage', methods=['GET'])
@jwt_required()
def get_coverage():
    """获取覆盖率数据"""
    try:
        user_id = get_jwt_identity()
        
        # 计算案例解决率
        total_cases = Case.query.filter_by(user_id=int(user_id)).count()
        resolved_cases = Case.query.filter(
            and_(Case.user_id == int(user_id), Case.status == 'resolved')
        ).count()
        
        resolution_rate = round((resolved_cases / total_cases * 100) if total_cases > 0 else 0, 1)
        
        # 计算知识库覆盖率（简单模拟）
        total_docs = KnowledgeDocument.query.filter_by(
            user_id=int(user_id), 
            is_deleted=False
        ).count()
        
        # 模拟覆盖率数据
        coverage_data = {
            'case_resolution': {
                'rate': resolution_rate,
                'total': total_cases,
                'resolved': resolved_cases
            },
            'knowledge_base': {
                'documents': total_docs,
                'coverage': min(total_docs * 10, 100)  # 简单计算
            }
        }
        
        return jsonify({
            'code': 200,
            'status': 'success',
            'data': coverage_data
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'status': 'error',
            'error': {
                'type': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500
