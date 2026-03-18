// Electron API 类型定义
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

export {};
