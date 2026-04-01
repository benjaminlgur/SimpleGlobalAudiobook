import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACTIVE_STORAGE_SCOPE_KEY,
  getScopedStorageKey,
} from "../lib/storageScope";

const LAST_PLAYING_BOOK_KEY = "audiobook_last_playing_book_key";

function isTrackPlayerNotificationPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized.startsWith("trackplayer://notification.click") ||
    normalized === "notification.click" ||
    normalized.endsWith("/notification.click")
  );
}

export async function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): Promise<string> {
  try {
    if (!isTrackPlayerNotificationPath(path)) {
      return path;
    }

    const activeScope = await AsyncStorage.getItem(ACTIVE_STORAGE_SCOPE_KEY);
    const scopedLastPlayingKey = activeScope
      ? await AsyncStorage.getItem(
          getScopedStorageKey(LAST_PLAYING_BOOK_KEY, activeScope),
        )
      : null;
    const lastBookKey =
      scopedLastPlayingKey ??
      (await AsyncStorage.getItem(LAST_PLAYING_BOOK_KEY));
    if (lastBookKey) {
      return `/player?bookKey=${encodeURIComponent(lastBookKey)}`;
    }

    return "/library";
  } catch {
    return "/library";
  }
}
