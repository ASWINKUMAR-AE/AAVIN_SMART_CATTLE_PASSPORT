import type { Href, useRouter } from 'expo-router';

type BackRouter = Pick<ReturnType<typeof useRouter>, 'canGoBack' | 'back' | 'replace'>;

// Direct links and reloaded screens can open without a previous route.
export function goBackOrReplace(router: BackRouter, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
