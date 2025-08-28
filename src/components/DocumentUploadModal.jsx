import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Upload, Select, Tag, Input, Space, Progress, message } from 'antd';
import { InboxOutlined, CloseOutlined } from '@ant-design/icons';
import { uploadDocument, parseDocumentWithIDP, getDocumentProcessingStatus, getParsingJobStatus } from '../api/knowledge';

const { Dragger } = Upload;
const { Option } = Select;

const DocumentUploadModal = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [vendor, setVendor] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [uploadedDocId, setUploadedDocId] = useState(null);
  const [parsingJobId, setParsingJobId] = useState(null);
  const uploadControllerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // 进度动画相关引用
  const uploadProgressRef = useRef(0);
  const uploadTargetRef = useRef(0);
  const uploadAnimRef = useRef(null);

  const parseProgressRef = useRef(0);
  const parseTargetRef = useRef(0);
  const parseAnimRef = useRef(null);

  // 网络设备厂商选项
  const vendorOptions = [
    'Huawei',
    'Cisco',
    'Juniper',
    'H3C',
    'Ruijie',
    'Nokia',
    'Arista',
    'RFC标准',
    '其他'
  ];

  // 预定义标签选项
  const tagSuggestions = [
    '技术文档',
    '用户手册',
    'API文档',
    '故障排查',
    '最佳实践',
    '架构设计',
    '性能优化',
    '安全指南'
  ];

  // 平滑进度动画：上传
  const startUploadAnimator = () => {
    if (uploadAnimRef.current) return;
    uploadAnimRef.current = setInterval(() => {
      const cur = uploadProgressRef.current;
      const tgt = uploadTargetRef.current;
      if (tgt <= cur) {
        if (cur !== tgt) {
          setUploadProgress(tgt);
          uploadProgressRef.current = tgt;
        }
        clearInterval(uploadAnimRef.current);
        uploadAnimRef.current = null;
        return;
      }
      const diff = tgt - cur;
      const step = diff > 10 ? Math.ceil(diff * 0.15) : 1; // 距离越大步长越大
      const next = Math.min(tgt, cur + step);
      setUploadProgress(next);
      uploadProgressRef.current = next;
    }, 60);
  };

  const animateUploadTo = (target) => {
    uploadTargetRef.current = Math.max(0, Math.min(100, Math.round(target)));
    startUploadAnimator();
  };

  // 平滑进度动画：解析
  const startParseAnimator = () => {
    if (parseAnimRef.current) return;
    parseAnimRef.current = setInterval(() => {
      const cur = parseProgressRef.current;
      const tgt = parseTargetRef.current;
      if (tgt <= cur) {
        if (cur !== tgt) {
          setParseProgress(tgt);
          parseProgressRef.current = tgt;
        }
        clearInterval(parseAnimRef.current);
        parseAnimRef.current = null;
        return;
      }
      const diff = tgt - cur;
      const step = diff > 10 ? Math.ceil(diff * 0.1) : 1; // 逐步逼近目标
      const next = Math.min(tgt, cur + step);
      setParseProgress(next);
      parseProgressRef.current = next;
    }, 80);
  };

  const animateParseTo = (target) => {
    parseTargetRef.current = Math.max(0, Math.min(100, Math.round(target)));
    startParseAnimator();
  };

  // 组件卸载清理
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (uploadAnimRef.current) {
        clearInterval(uploadAnimRef.current);
        uploadAnimRef.current = null;
      }
      if (parseAnimRef.current) {
        clearInterval(parseAnimRef.current);
        parseAnimRef.current = null;
      }
    };
  }, []);

  // 处理文件选择
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    return false; // 阻止自动上传
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 快速添加建议标签
  const handleAddSuggestedTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  // 基于状态阶段的进度映射
  const getProgressFromStatus = (docStatus, jobStatus = null) => {
    // 优先使用解析任务状态
    if (jobStatus) {
      switch (jobStatus) {
        case 'PENDING': return 10;
        case 'PROCESSING': return 50;
        case 'COMPLETED': return 100;
        case 'FAILED': return 0;
        default: return 0;
      }
    }
    
    // 使用文档状态
    switch (docStatus) {
      case 'QUEUED': return 20;
      case 'PARSING': return 60;
      case 'INDEXED': return 100;
      case 'FAILED': return 0;
      default: return 0;
    }
  };

  // 真实解析进度跟踪
  const trackRealParsingProgress = async (docId, jobId = null) => {
    
    const checkProgress = async () => {
      try {
        let currentDocStatus = null;
        let currentJobStatus = null;
        
        // 优先使用解析任务状态API（更详细）
        if (jobId) {
          try {
            const jobStatus = await getParsingJobStatus(jobId);
            
            if (jobStatus.data) {
              currentJobStatus = jobStatus.data.status;
              currentDocStatus = jobStatus.data.document?.status;
              
              const progress = getProgressFromStatus(currentDocStatus, currentJobStatus);
              animateParseTo(progress);
              
              if (currentJobStatus === 'COMPLETED') {
                message.success('文档解析完成！');
                setTimeout(() => {
                  resetModal();
                  onSuccess && onSuccess();
                  onClose();
                }, 1000);
                return true; // 完成
              } else if (currentJobStatus === 'FAILED') {
                message.error('文档解析失败');
                setParsing(false);
                return true; // 失败，停止轮询
              }
            }
          } catch (error) {
            // 解析任务状态API调用失败，静默处理
          }
        }
        
        // 使用文档状态API作为备选
        if (!currentDocStatus) {
          const docStatus = await getDocumentProcessingStatus(docId);
          
          if (docStatus.data) {
            // 根据后端API实际返回的字段结构获取状态
            currentDocStatus = docStatus.data.documentStatus || docStatus.data.status;
            
            const progress = getProgressFromStatus(currentDocStatus);
            animateParseTo(progress);
            
            if (currentDocStatus === 'INDEXED') {
              message.success('文档解析完成！');
              setTimeout(() => {
                resetModal();
                onSuccess && onSuccess();
                onClose();
              }, 1000);
              return true; // 完成
            } else if (currentDocStatus === 'FAILED') {
              message.error('文档解析失败');
              setParsing(false);
              return true; // 失败，停止轮询
            }
          }
        }
        
        return false; // 继续轮询
      } catch (error) {
        console.error('获取解析进度失败:', error);
        return false; // 继续轮询
      }
    };

    // 立即检查一次
    const completed = await checkProgress();
    if (completed) return;

    // 设置定时轮询
    progressIntervalRef.current = setInterval(async () => {
      const completed = await checkProgress();
      if (completed && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 2000); // 每2秒检查一次
  };

  // 处理文档上传
  const handleUpload = async () => {
    if (!selectedFile) {
      message.error('请先选择文件');
      return;
    }

    if (!vendor) {
      message.error('请选择文档厂商');
      return;
    }

    setUploading(true);
    // 重置上传进度与动画
    if (uploadAnimRef.current) {
      clearInterval(uploadAnimRef.current);
      uploadAnimRef.current = null;
    }
    uploadProgressRef.current = 0;
    uploadTargetRef.current = 0;
    setUploadProgress(0);

    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('docType', 'pdf');
      formData.append('vendor', vendor);
      if (tags.length > 0) {
        formData.append('tags', tags.join(','));
      }

      // 创建上传控制器
      const controller = new AbortController();
      uploadControllerRef.current = controller;

      // 上传文档
      const uploadResponse = await uploadDocument(formData, (percent) => {
        // 目标逐步逼近，不直接跳变
        animateUploadTo(Math.min(99, Math.floor(percent)));
      });

      animateUploadTo(100);
      setUploadedDocId(uploadResponse.data.docId);
      message.success('文档上传成功！');

      // 开始解析阶段
      setParsing(true);
      animateParseTo(10); // 初始进度平滑到10
      setUploading(false);

      // 检查上传响应中是否已经包含解析状态
      if (uploadResponse.data.status === 'PARSING' || uploadResponse.data.status === 'QUEUED') {
        // 后端已经自动开始解析，使用真实进度跟踪
        
        // 获取解析任务ID（如果有的话）
        const jobId = uploadResponse.data.jobId || uploadResponse.data.parsing_job_id;
        setParsingJobId(jobId);
        
        // 立即设置基于状态的初始进度
        const initialProgress = getProgressFromStatus(uploadResponse.data.status);
        animateParseTo(initialProgress);
        
        // 开始真实进度跟踪
        trackRealParsingProgress(uploadResponse.data.docId, jobId);
      } else {
        // 如果后端没有自动解析，则手动触发解析
        
        try {
          // 等待一小段时间确保上传完全完成
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const parseResponse = await parseDocumentWithIDP(uploadResponse.data.docId);
          
          // 获取解析任务ID
          const jobId = parseResponse.data?.jobId || parseResponse.data?.parsing_job_id;
          setParsingJobId(jobId);
          
          // 开始真实进度跟踪
          trackRealParsingProgress(uploadResponse.data.docId, jobId);
        } catch (error) {
          console.error('手动解析失败:', error);
          message.error('文档解析失败: ' + (error.message || '未知错误'));
          setParsing(false);
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        message.info('上传已取消');
      } else {
        message.error('上传失败: ' + (error.message || '未知错误'));
      }
      setUploading(false);
    }
  };

  // 取消上传
  const handleCancelUpload = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
    }
    setUploading(false);
    // 停止上传动画并复位
    if (uploadAnimRef.current) {
      clearInterval(uploadAnimRef.current);
      uploadAnimRef.current = null;
    }
    uploadProgressRef.current = 0;
    uploadTargetRef.current = 0;
    setUploadProgress(0);
  };

  // 重置弹窗状态
  const resetModal = () => {
    setSelectedFile(null);
    setVendor('');
    setTags([]);
    setTagInput('');
    setUploading(false);
    setUploadProgress(0);
    setParsing(false);
    setParseProgress(0);
    setUploadedDocId(null);
    setParsingJobId(null);
    
    // 清理进度轮询
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // 清理动画定时器并复位引用
    if (uploadAnimRef.current) {
      clearInterval(uploadAnimRef.current);
      uploadAnimRef.current = null;
    }
    if (parseAnimRef.current) {
      clearInterval(parseAnimRef.current);
      parseAnimRef.current = null;
    }
    uploadProgressRef.current = 0;
    uploadTargetRef.current = 0;
    parseProgressRef.current = 0;
    parseTargetRef.current = 0;
  };

  // 关闭弹窗
  const handleClose = () => {
    if (!uploading && !parsing) {
      resetModal();
      onClose();
    }
  };

  return (
    <Modal
      title="上传文档"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
      maskClosable={false}
      closable={!uploading && !parsing}
    >
      {/* 文件选择区 */}
      {!uploading && !parsing && (
        <>
          <div className="mb-4">
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={handleFileSelect}
              onRemove={() => setSelectedFile(null)}
              fileList={selectedFile ? [{
                uid: '-1',
                name: selectedFile.name,
                status: 'done',
              }] : []}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个文件上传，支持 PDF、Word、图片等格式
              </p>
            </Dragger>
          </div>

          {/* 厂商选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档厂商 <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="请选择文档厂商"
              style={{ width: '100%' }}
              value={vendor}
              onChange={setVendor}
            >
              {vendorOptions.map(option => (
                <Option key={option} value={option}>
                  {option}
                </Option>
              ))}
            </Select>
          </div>

          {/* 标签管理 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档标签
            </label>
            
            {/* 标签输入 */}
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Input
                placeholder="输入标签"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={handleAddTag}
              />
              <Button type="primary" onClick={handleAddTag}>
                添加
              </Button>
            </Space.Compact>

            {/* 快速标签选择 */}
            <div className="mb-2">
              <span className="text-sm text-gray-500 mr-2">快速添加：</span>
              {tagSuggestions.map(tag => (
                <Tag
                  key={tag}
                  className="cursor-pointer mb-1"
                  color={tags.includes(tag) ? 'blue' : 'default'}
                  onClick={() => handleAddSuggestedTag(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </div>

            {/* 已选标签 */}
            {tags.length > 0 && (
              <div className="mt-2">
                <span className="text-sm text-gray-500 mr-2">已选标签：</span>
                {tags.map(tag => (
                  <Tag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                    color="blue"
                    className="mb-1"
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-2">
            <Button onClick={handleClose}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleUpload}
              disabled={!selectedFile || !vendor}
            >
              开始上传
            </Button>
          </div>
        </>
      )}

      {/* 上传进度 */}
      {uploading && (
        <div className="py-8">
          <div className="text-center mb-4">
            <div className="text-lg font-medium mb-2">正在上传文档...</div>
            <Progress percent={uploadProgress} status="active" />
          </div>
          <div className="text-center">
            <Button danger onClick={handleCancelUpload}>
              取消上传
            </Button>
          </div>
        </div>
      )}

      {/* 解析进度 */}
      {parsing && (
        <div className="py-8">
          <div className="text-center mb-4">
            <div className="text-lg font-medium mb-2">正在解析文档...</div>
            <Progress percent={parseProgress} status="active" />
            <div className="text-sm text-gray-500 mt-2">
              请稍候，文档解析可能需要几分钟时间
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DocumentUploadModal;
