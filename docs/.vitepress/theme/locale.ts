import { computed, type ComputedRef } from 'vue';
import { useData, useRoute, useRouter } from 'vitepress';

export type DocsLocale = 'en' | 'ko';

export function useDocsLocale(): {
  readonly locale: ComputedRef<DocsLocale>;
  readonly isKorean: ComputedRef<boolean>;
  readonly setLocale: (locale: DocsLocale) => void;
} {
  const route = useRoute();
  const router = useRouter();
  const { lang, site } = useData();
  const isKorean = computed(() => {
    const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
    return lang.value.toLowerCase().startsWith('ko')
      || /(?:^|\/)ko(?:\/|$)/u.test(route.path)
      || /(?:^|\/)ko(?:\/|$)/u.test(pathname);
  });
  const locale = computed<DocsLocale>(() => isKorean.value ? 'ko' : 'en');

  return {
    locale,
    isKorean,
    setLocale(next) {
      const base = site.value.base.replace(/\/$/u, '');
      const pathname = typeof window === 'undefined' ? route.path : window.location.pathname;
      const relativePath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
      const barePath = relativePath.replace(/^\/ko(?=\/|$)/u, '') || '/';
      const localizedPath = next === 'ko' ? `/ko${barePath}` : barePath;
      const target = `${base}${localizedPath}`.replace(/\/{2,}/gu, '/');
      void router.go(target);
    },
  };
}
