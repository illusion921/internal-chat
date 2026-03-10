import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatTime(time: string | Date): string {
  const date = dayjs(time);
  const now = dayjs();
  
  // 今天：只显示时间
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm');
  }
  
  // 昨天
  if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return `昨天 ${date.format('HH:mm')}`;
  }
  
  // 今年
  if (date.isSame(now, 'year')) {
    return date.format('MM-DD HH:mm');
  }
  
  // 其他
  return date.format('YYYY-MM-DD HH:mm');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}