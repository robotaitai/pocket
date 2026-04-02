import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes a narrow, typed API from the main process to the renderer.
 * contextIsolation=true ensures renderer JS cannot access Node.js directly.
 */
contextBridge.exposeInMainWorld('pocket', {
  settings: {
    get: (key: string): Promise<string | undefined> =>
      ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
  },
  secrets: {
    get: (account: string): Promise<string | null> =>
      ipcRenderer.invoke('secrets:get', account),
    set: (account: string, secret: string): Promise<void> =>
      ipcRenderer.invoke('secrets:set', account, secret),
    delete: (account: string): Promise<void> =>
      ipcRenderer.invoke('secrets:delete', account),
  },
});
