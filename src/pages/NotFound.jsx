import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">页面未找到</h2>
      <p className="text-gray-600 mb-4">您访问的页面不存在。</p>
      <Link to="/" className="text-blue-600 hover:underline">返回首页</Link>
    </div>
  );
}
