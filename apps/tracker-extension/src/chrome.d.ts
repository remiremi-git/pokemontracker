declare const chrome: {
  runtime: {
    getURL(path: string): string;
    onInstalled: {
      addListener(callback: () => void): void;
    };
    onStartup: {
      addListener(callback: () => void): void;
    };
    onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };
    sendMessage(message: unknown, callback?: (response: unknown) => void): void;
  };
  alarms: {
    create(name: string, options: { periodInMinutes: number }): void;
    onAlarm: {
      addListener(callback: (alarm: { name: string }) => void): void;
    };
  };
  storage: {
    local: {
      get<T extends Record<string, unknown>>(
        keys: string[] | Record<string, unknown>,
        callback: (items: Partial<T>) => void
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
    };
  };
};
