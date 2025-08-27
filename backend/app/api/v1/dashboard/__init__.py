"""
Dashboard API模块
"""

from flask import Blueprint

dashboard_bp = Blueprint('dashboard', __name__)

from . import routes
