import React, { Suspense } from 'react';
import { Spin } from 'antd';

/**
 * 懒加载组件包装器
 * @param componentImport 动态导入函数
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    const component = await componentImport();
    return { default: component.default };
  });
}

/**
 * 加载 fallback 组件
 */
export const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

/**
 * Suspense 包装器
 */
export const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
);
