/**
 * 获取完整的资源URL
 * 用于处理相对路径的资源（如头像、图片等）
 */
import { config } from '@src/config';

/**
 * 获取完整的资源URL
 * @param path 相对路径或完整URL
 * @returns 完整的URL
 */
export function getAssetUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }
  
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  
  // 如果是相对路径，拼接服务器地址
  const serverUrl = config.apiBaseUrl.replace('/api', '');
  if (serverUrl) {
    return `${serverUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  
  // 默认使用当前域名
  return path;
}

/**
 * 获取头像URL
 * @param avatar 头像路径
 * @returns 完整的头像URL
 */
export function getAvatarUrl(avatar: string | null | undefined): string {
  return getAssetUrl(avatar) || '';
}