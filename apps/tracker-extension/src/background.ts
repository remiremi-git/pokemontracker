import { DATA_MANIFEST_URL, REFRESH_ALARM_NAME, REFRESH_PERIOD_MINUTES } from "./config.js";
import { checkForDataUpdates } from "./dataClient.js";
import { getCachedRuntimeData } from "./storage.js";

type LookupMessage = {
  type: "lookup";
  entity: "move" | "ability";
  normalizedName: string;
};

type RefreshMessage = {
  type: "refresh";
};

type ExtensionMessage = LookupMessage | RefreshMessage;

async function refreshInBackground() {
  return checkForDataUpdates(DATA_MANIFEST_URL);
}

async function findCachedEntity(entity: "move" | "ability", normalizedName: string) {
  const cached = await getCachedRuntimeData();
  const result = entity === "move" ? cached.movesByName?.[normalizedName] : cached.abilitiesByName?.[normalizedName];

  return {
    result: result ?? null,
    version: cached.manifest?.version ?? null,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM_NAME, { periodInMinutes: REFRESH_PERIOD_MINUTES });
  void refreshInBackground();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM_NAME, { periodInMinutes: REFRESH_PERIOD_MINUTES });
  void refreshInBackground();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM_NAME) {
    void refreshInBackground();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message as Partial<ExtensionMessage>;

  if (
    request.type === "lookup" &&
    (request.entity === "move" || request.entity === "ability") &&
    request.normalizedName
  ) {
    const normalizedName = request.normalizedName;
    const entity = request.entity;

    void findCachedEntity(entity, normalizedName).then(async (cachedLookup) => {
      if (cachedLookup.result) {
        sendResponse(cachedLookup);
        void refreshInBackground();
        return;
      }

      await refreshInBackground();
      sendResponse(await findCachedEntity(entity, normalizedName));
    });
    return true;
  }

  if (request.type === "refresh") {
    void refreshInBackground().then(sendResponse);
    return true;
  }

  return undefined;
});
