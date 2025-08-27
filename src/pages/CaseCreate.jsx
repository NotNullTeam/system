import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../api/cases.js';
import { uploadFile } from '../api/files.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function CaseCreate() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    problem_description: '',
    network_topology: '',
    device_vendor: '',
    urgency_level: 'medium',
    attachments: []
  });
  const [files, setFiles] = useState([]);

  // 检查认证状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  async function handleFileUpload(e) {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    // 准备文件上传
    const uploadPromises = selectedFiles.map(file => {
      return uploadFile(file);
    });
    
    try {
      const results = await Promise.all(uploadPromises);
      const fileIds = results.map(r => r?.data?.file_info?.id).filter(Boolean);
      setFormData(prev => ({ ...prev, attachments: fileIds }));
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('部分文件上传失败，请重试');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.problem_description.trim()) {
      alert('请描述您遇到的问题');
      return;
    }

    setLoading(true);
    try {
      // 创建案例（与后端契约对齐）
      const caseResponse = await createCase({
        query: formData.problem_description,
        attachments: formData.attachments,
        vendor: formData.device_vendor || undefined,
        useLanggraph: false
      });

      const caseId = caseResponse?.data?.caseId;
      if (caseId) {
        // 跳转到案例详情页
        navigate(`/cases/${caseId}`);
      }
    } catch (error) {
      console.error('创建案例失败:', error);
      if (error?.response?.status === 401) {
        alert('登录已过期，请重新登录');
        navigate('/login');
      } else {
        alert(error?.response?.data?.error?.message || '创建案例失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">创建新的诊断案例</h1>
        <p className="mt-2 text-gray-600">描述您遇到的网络问题，AI将为您提供智能诊断和解决方案</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* 问题描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            问题描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.problem_description}
            onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
            rows={6}
            placeholder="请详细描述您遇到的问题，例如：
• OSPF邻居关系无法建立，一直处于ExStart状态
• BGP路由收不到对端发布的路由信息
• VPN隧道建立失败，Phase 1协商不成功
• 网络延迟突然增大，丢包率上升..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
          <p className="mt-1 text-sm text-gray-500">越详细的描述越有助于AI准确诊断问题</p>
        </div>

        {/* 网络拓扑 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            网络拓扑描述（可选）
          </label>
          <textarea
            value={formData.network_topology}
            onChange={(e) => setFormData({ ...formData, network_topology: e.target.value })}
            rows={3}
            placeholder="描述您的网络拓扑结构，例如：三层架构，核心-汇聚-接入，使用OSPF+BGP..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 设备厂商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              主要设备厂商
            </label>
            <select
              value={formData.device_vendor}
              onChange={(e) => setFormData({ ...formData, device_vendor: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择</option>
              <option value="华为">华为 (Huawei)</option>
              <option value="思科">思科 (Cisco)</option>
              <option value="新华三">新华三 (H3C)</option>
              <option value="瞻博">瞻博 (Juniper)</option>
              <option value="锐捷">锐捷 (Ruijie)</option>
              <option value="其他">其他</option>
            </select>
          </div>

          {/* 紧急程度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              紧急程度
            </label>
            <select
              value={formData.urgency_level}
              onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">低 - 计划性维护</option>
              <option value="medium">中 - 影响部分业务</option>
              <option value="high">高 - 影响核心业务</option>
              <option value="critical">紧急 - 业务中断</option>
            </select>
          </div>
        </div>

        {/* 文件上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            附件上传（可选）
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              multiple
              accept=".txt,.log,.conf,.cfg,.png,.jpg,.jpeg,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-gray-600">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm">点击上传配置文件、日志文件或拓扑图</p>
                <p className="text-xs text-gray-500 mt-1">支持 txt, log, conf, cfg, png, jpg, pdf 格式</p>
              </div>
            </label>
            {files.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                已选择 {files.length} 个文件：
                <div className="mt-2 space-y-1">
                  {files.map((file, index) => (
                    <div key={index} className="text-xs bg-gray-100 rounded px-2 py-1 inline-block mr-2">
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || !formData.problem_description.trim()}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                创建中...
              </>
            ) : (
              <>
                <span>🚀</span>
                开始诊断
              </>
            )}
          </button>
        </div>
      </form>

      {/* 使用提示 */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-3">💡 使用提示</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>提供详细的错误信息、日志输出有助于快速定位问题</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>上传相关配置文件和拓扑图可以让AI更准确地分析问题</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>诊断过程中AI可能会追问细节，请及时补充信息</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
