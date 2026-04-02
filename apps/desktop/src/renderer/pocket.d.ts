/** Type declarations for the API exposed by the preload script via contextBridge. */
interface PocketApi {
  settings: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
  };
  secrets: {
    get(account: string): Promise<string | null>;
    set(account: string, secret: string): Promise<void>;
    delete(account: string): Promise<void>;
  };
}

interface Window {
  pocket: PocketApi;
}
