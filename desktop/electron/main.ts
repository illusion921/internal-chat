import { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let unreadCount = 0;
let isFlashing = false;
let flashInterval: NodeJS.Timeout | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: '内网聊天',
    show: false,
    icon: path.join(__dirname, 'icon.png'),
  });

  // 窗口准备好后再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    // 开发模式加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  // 创建菜单
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于', click: () => {
          dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: '关于',
            message: '内网聊天系统',
            detail: '版本: 1.0.0\n一个轻量级的内网即时通讯工具'
          });
        }}
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  // 窗口获得焦点时停止闪烁并清除未读数
  mainWindow.on('focus', () => {
    stopFlashing();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopFlashing();
  });
}

// 设置任务栏图标徽章 (macOS) 或闪烁 (Windows)
function setUnreadBadge(count: number) {
  unreadCount = count;
  
  if (process.platform === 'darwin') {
    // macOS: 设置 Dock 图标徽章
    if (count > 0) {
      app.dock.setBadge(count > 99 ? '99+' : String(count));
    } else {
      app.dock.setBadge('');
    }
  } else if (process.platform === 'win32') {
    // Windows: 设置任务栏图标覆盖层
    if (mainWindow) {
      if (count > 0) {
        // 创建带数字的覆盖图标
        const canvas = createBadgeImage(count);
        const badgeImage = nativeImage.createFromDataURL(canvas);
        mainWindow.setOverlayIcon(badgeImage, `${count}条未读消息`);
        
        // 如果窗口没有焦点，开始闪烁
        if (!mainWindow.isFocused()) {
          startFlashing();
        }
      } else {
        mainWindow.setOverlayIcon(null, '');
        stopFlashing();
      }
    }
  }
}

// 创建徽章图像
function createBadgeImage(count: number): string {
  const text = count > 99 ? '99+' : String(count);
  // 创建一个简单的 SVG 作为徽章
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="24" cy="8" r="8" fill="#ff4d4f"/>
      <text x="24" y="12" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold">${text}</text>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// 开始闪烁任务栏图标
function startFlashing() {
  if (isFlashing || !mainWindow) return;
  isFlashing = true;
  mainWindow.flashFrame(true);
}

// 停止闪烁
function stopFlashing() {
  if (!isFlashing) return;
  isFlashing = false;
  if (mainWindow) {
    mainWindow.flashFrame(false);
  }
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
}

// IPC 处理器
ipcMain.handle('badge:setUnread', async (_, count: number) => {
  setUnreadBadge(count);
  return { success: true };
});

ipcMain.handle('badge:clear', async () => {
  setUnreadBadge(0);
  return { success: true };
});

// 文件选择对话框
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result.filePaths;
});

// 保存文件对话框
ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, options);
  return result.filePath;
});

// 读取本地文件
ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath);
    return { success: true, data: content.toString('base64') };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 写入本地文件
ipcMain.handle('file:write', async (_, filePath: string, data: string) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});