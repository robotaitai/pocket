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
  review: {
    getBatches: () => ipcRenderer.invoke('review:getBatches'),
    getTransactions: (opts: object) => ipcRenderer.invoke('review:getTransactions', opts),
    accept: (ids: string[]) => ipcRenderer.invoke('review:accept', ids),
    reject: (ids: string[]) => ipcRenderer.invoke('review:reject', ids),
    setCategory: (id: string, category: string, saveMerchantRule: boolean) =>
      ipcRenderer.invoke('review:setCategory', id, category, saveMerchantRule),
    undo: () => ipcRenderer.invoke('review:undo'),
  },
  merchantRules: {
    getAll: () => ipcRenderer.invoke('merchantRules:getAll'),
    suggest: (description: string) => ipcRenderer.invoke('merchantRules:suggest', description),
    delete: (id: string) => ipcRenderer.invoke('merchantRules:delete', id),
  },
});
