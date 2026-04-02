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
  insights: {
    getSummary: (periodKey: string) => ipcRenderer.invoke('insights:getSummary', periodKey),
    getRecurring: () => ipcRenderer.invoke('insights:getRecurring'),
    getMerchants: (limit: number) => ipcRenderer.invoke('insights:getMerchants', limit),
    getNewMerchants: () => ipcRenderer.invoke('insights:getNewMerchants'),
    search: (filter: object) => ipcRenderer.invoke('insights:search', filter),
    getImportHealth: () => ipcRenderer.invoke('insights:getImportHealth'),
    chat: (question: string) => ipcRenderer.invoke('insights:chat', question),
    export: (filter: object) => ipcRenderer.invoke('insights:export', filter),
  },
  provider: {
    getConfig: () => ipcRenderer.invoke('provider:getConfig'),
    setConfig: (config: object) => ipcRenderer.invoke('provider:setConfig', config),
    setKey: (providerType: string, apiKey: string) => ipcRenderer.invoke('provider:setKey', providerType, apiKey),
    clearKey: (providerType: string) => ipcRenderer.invoke('provider:clearKey', providerType),
    testConnection: () => ipcRenderer.invoke('provider:testConnection'),
  },
  fileImport: {
    pickAndExtract: () => ipcRenderer.invoke('fileImport:pickAndExtract'),
  },
});
