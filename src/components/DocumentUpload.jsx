import React, { useState, useCallback } from 'react';
import { uploadDocument, parseDocumentWithIDP } from '../api/knowledge';

const DocumentUpload = ({ onUploadComplete, onError }) => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    uploadProgress: 0,
    processingProgress: 0,
    currentStep: '',
    canCancel: true,
    error: null,
    showParsingModal: false
  });

  const [abortController, setAbortController] = useState(null);

  // 重置上传状态
  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      uploadProgress: 0,
      processingProgress: 0,
      currentStep: '',
      canCancel: true,
      error: null,
      showParsingModal: false
    });
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  // 取消上传
  const cancelUpload = useCallback(() => {
    if (abortController && uploadState.canCancel) {
      abortController.abort();
      resetUploadState();
    }
  }, [abortController, uploadState.canCancel, resetUploadState]);

  // 模拟处理进度
  const simulateProcessingProgress = useCallback((startProgress = 0, endProgress = 100, duration = 3000) => {
    return new Promise((resolve) => {
      const steps = 20;
      const stepDuration = duration / steps;
      const progressStep = (endProgress - startProgress) / steps;
      let currentProgress = startProgress;

      const interval = setInterval(() => {
        currentProgress += progressStep;
        setUploadState(prev => ({
          ...prev,
          processingProgress: Math.min(currentProgress, endProgress)
        }));

        if (currentProgress >= endProgress) {
          clearInterval(interval);
          resolve();
        }
      }, stepDuration);
    });
  });

  // 处理文件上传
  const handleFileUpload = useCallback(async (file, options = {}) => {
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setUploadState({
        isUploading: true,
        uploadProgress: 0,
        processingProgress: 0,
        currentStep: '准备上传文件...',
        canCancel: true,
        error: null
      });

      // 创建表单数据
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', options.title || file.name);
      formData.append('description', options.description || '');

      // 第一阶段：文件上传
      setUploadState(prev => ({ ...prev, currentStep: '正在上传文件...' }));
      
      const uploadResponse = await uploadDocument(formData, (progress) => {
        setUploadState(prev => ({ ...prev, uploadProgress: progress }));
      });

      if (controller.signal.aborted) return;

      // 第二阶段：文档解析处理
      setUploadState(prev => ({ 
        ...prev, 
        currentStep: '正在解析文档内容...',
        canCancel: false, // 解析阶段不能取消
        showParsingModal: true // 显示强制模态窗口
      }));

      // 启动处理进度模拟
      const processingPromise = simulateProcessingProgress(0, 90, 8000);

      // 实际的文档解析
      const parsePromise = parseDocumentWithIDP(uploadResponse.data.docId, {
        enable_llm: options.enable_llm !== false,
        enable_formula: options.enable_formula !== false
      });

      // 等待两个Promise完成
      const [, parseResponse] = await Promise.all([processingPromise, parsePromise]);

      if (controller.signal.aborted) return;

      // 完成阶段
      setUploadState(prev => ({ 
        ...prev, 
        currentStep: '处理完成！',
        processingProgress: 100
      }));

      // 延迟一下显示完成状态
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, showParsingModal: false }));
        setTimeout(() => {
          resetUploadState();
          if (onUploadComplete) {
            onUploadComplete({
              document: uploadResponse.data.document,
              parseResult: parseResponse.data
            });
          }
        }, 500);
      }, 1500);

    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.error('文档上传失败:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || '上传失败';
      
      setUploadState(prev => ({
        ...prev,
        error: errorMessage,
        currentStep: '上传失败',
        canCancel: false,
        showParsingModal: false
      }));

      if (onError) {
        onError(error);
      }
    }
  }, [resetUploadState, simulateProcessingProgress, onUploadComplete, onError]);

  // 文件拖拽处理
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // 文件选择处理
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 上传区域 */}
      {!uploadState.isUploading && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg font-medium text-gray-700 mb-2">
            拖拽文件到此处或点击选择文件
          </p>
          <p className="text-sm text-gray-500">
            支持 PDF, DOC, DOCX, TXT 等格式
          </p>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* 上传进度界面 */}
      {uploadState.isUploading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">文档处理中</h3>
            {uploadState.canCancel && (
              <button
                onClick={cancelUpload}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                取消
              </button>
            )}
          </div>

          {/* 当前步骤 */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">{uploadState.currentStep}</p>
            
            {/* 上传进度 */}
            {uploadState.uploadProgress > 0 && uploadState.uploadProgress < 100 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>文件上传</span>
                  <span>{uploadState.uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 处理进度 */}
            {uploadState.processingProgress > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>文档解析</span>
                  <span>{Math.round(uploadState.processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.processingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {uploadState.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="text-red-400 mr-2">⚠️</div>
                <div>
                  <p className="text-sm text-red-800 font-medium">上传失败</p>
                  <p className="text-sm text-red-700 mt-1">{uploadState.error}</p>
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={resetUploadState}
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md font-medium"
                >
                  重新尝试
                </button>
              </div>
            </div>
          )}

          {/* 处理提示 */}
          {!uploadState.error && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <div className="text-blue-400 mr-2">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">正在处理您的文档</p>
                  <p className="mt-1">
                    文档解析可能需要几分钟时间，请耐心等待。处理完成后您可以继续使用其他功能。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 强制解析模态窗口 */}
      {uploadState.showParsingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              {/* 加载动画 */}
              <div className="mb-6">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
              
              {/* 标题 */}
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                正在解析文档内容
              </h3>
              
              {/* 描述 */}
              <p className="text-gray-600 mb-6">
                系统正在使用AI技术深度解析您的文档，提取关键信息并建立知识索引。
                这个过程可能需要几分钟时间，请耐心等待。
              </p>
              
              {/* 进度条 */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>解析进度</span>
                  <span>{Math.round(uploadState.processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadState.processingProgress}%` }}
                  />
                </div>
              </div>
              
              {/* 提示信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <div className="text-blue-500 mr-2">💡</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">处理中，请勿关闭页面</p>
                    <p className="mt-1">解析完成后将自动返回文档列表</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
