import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件对话框
  openFile: (options?: Electron.OpenDialogOptions) => 
    ipcRenderer.invoke('dialog:openFile', options),
  
  saveFile: (options?: Electron.SaveDialogOptions) => 
    ipcRenderer.invoke('dialog:saveFile', options),
  
  // 文件操作
  readFile: (filePath: string) => 
    ipcRenderer.invoke('file:read', filePath),
  
  writeFile: (filePath: string, data: string) => 
    ipcRenderer.invoke('file:write', filePath, data),
  
  // 平台信息
  platform: process.platform,
  
  // 应用版本
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // 任务栏徽章
  setUnreadBadge: (count: number) => 
    ipcRenderer.invoke('badge:setUnread', count),
  
  clearUnreadBadge: () => 
    ipcRenderer.invoke('badge:clear'),
});

// TypeScript 类型定义
export interface ElectronAPI {
  openFile: (options?: Electron.OpenDialogOptions) => Promise<string[]>;
  saveFile: (options?: Electron.SaveDialogOptions) => Promise<string | undefined>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  platform: NodeJS.Platform;
  getVersion: () => Promise<string>;
  setUnreadBadge: (count: number) => Promise<{ success: boolean }>;
  clearUnreadBadge: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}