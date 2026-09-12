import { computed, ref } from 'vue';
import { routes } from './routes.js';

export { routes } from './routes.js';

const basePath = import.meta.env.BASE_URL.replace(/\/$/u, '');

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  if (withLeadingSlash === '/') return '/';
  return withLeadingSlash.replace(/\/+$/u, '');
}

function pathFromLocation(): string {
  const pathname = window.location.pathname;
  const relative = basePath.length > 0 && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  return normalizePath(relative || '/');
}

export const currentPath = ref(pathFromLocation());
export const currentRoute = computed(() => routes.find((route) => route.path === currentPath.value) ?? null);

window.addEventListener('popstate', () => {
  currentPath.value = pathFromLocation();
});

export function routeHref(path: string): string {
  const normalized = normalizePath(path);
  return normalized === '/'
    ? `${basePath}/`
    : `${basePath}${normalized}/`;
}

export function navigate(path: string): void {
  const normalized = normalizePath(path);
  if (normalized === currentPath.value) return;
  window.history.pushState({}, '', routeHref(normalized));
  currentPath.value = normalized;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export function handleRouteClick(event: MouseEvent, path: string): void {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) {
    return;
  }

  event.preventDefault();
  navigate(path);
}
