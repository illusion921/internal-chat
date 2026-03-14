/**
 * 浏览器标签页通知工具
 * 当有新消息时在标签页标题显示未读数
 */

// 保存原始标题
let originalTitle: string = document.title;
let unreadCount: number = 0;
let titleInterval: number | null = null;
let isWindowFocused: boolean = true;

// 监听窗口焦点变化
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    isWindowFocused = true;
  });
  
  window.addEventListener('blur', () => {
    isWindowFocused = false;
  });
  
  // 页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 页面变为可见时，停止闪烁
      stopTitleBlink();
    }
  });
}

/**
 * 更新任务栏图标徽章 (Electron)
 */
function updateElectronBadge(count: number) {
  // 检查是否在 Electron 环境中
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    (window as any).electronAPI.setUnreadBadge(count);
  }
}

/**
 * 增加未读消息数并更新标题
 */
export function incrementUnread(count: number = 1) {
  unreadCount += count;
  updateTitle();
  updateElectronBadge(unreadCount);
  
  // 如果页面不可见，开始标题闪烁
  if (document.visibilityState === 'hidden' || !isWindowFocused) {
    startTitleBlink();
  }
}

/**
 * 设置未读消息数
 */
export function setUnreadCount(count: number) {
  unreadCount = count;
  updateTitle();
  updateElectronBadge(unreadCount);
  
  if (unreadCount === 0) {
    stopTitleBlink();
  }
}

/**
 * 清除未读消息
 */
export function clearUnread() {
  unreadCount = 0;
  stopTitleBlink();
  document.title = originalTitle;
  updateElectronBadge(0);
}

/**
 * 更新标题显示未读数
 */
function updateTitle() {
  if (unreadCount > 0) {
    document.title = `(${unreadCount}条新消息) ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }
}

/**
 * 开始标题闪烁
 */
function startTitleBlink() {
  if (titleInterval !== null) return;
  
  let showCount = true;
  titleInterval = window.setInterval(() => {
    if (unreadCount > 0) {
      if (showCount) {
        document.title = `【新消息(${unreadCount})】${originalTitle}`;
      } else {
        document.title = `【　　　　　】${originalTitle}`;
      }
      showCount = !showCount;
    }
  }, 500);
}

/**
 * 停止标题闪烁
 */
function stopTitleBlink() {
  if (titleInterval !== null) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
}

/**
 * 初始化，保存原始标题
 */
export function initTitleNotification() {
  originalTitle = document.title;
}

/**
 * 发送浏览器通知
 */
export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window)) {
    return;
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body, icon });
      }
    });
  }
}

/**
 * 请求浏览器通知权限
 */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}