"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Minimal query cache + hooks.
 *
 * The fullstack-crud-flow skill uses TanStack Query v5 (useQuery/useMutation,
 * query-key invalidation). That package is not installable in this environment,
 * so this module provides a small, same-shaped replacement: a shared cache keyed
 * by a string, useQuery(key, fn), useMutation({ mutationFn, onSuccess }), and
 * invalidateQueries(keyPrefix). Components depend only on these hook shapes, so
 * migrating to real TanStack Query later is a mechanical import swap.
 */

type Listener = () => void;

interface Entry<T = unknown> {
  data?: T;
  error?: Error;
  status: "idle" | "loading" | "success" | "error";
  promise?: Promise<void>;
  updatedAt: number;
}

class QueryCache {
  private store = new Map<string, Entry>();
  private listeners = new Map<string, Set<Listener>>();
  // Latest fetcher per key, kept by live useQuery subscriptions, so invalidate()
  // can actively re-run the request for mounted queries.
  private fetchers = new Map<string, () => Promise<unknown>>();

  get(key: string): Entry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: Entry): void {
    this.store.set(key, entry);
    this.emit(key);
  }

  registerFetcher(key: string, fn: () => Promise<unknown>): void {
    this.fetchers.set(key, fn);
  }

  hasSubscribers(key: string): boolean {
    const set = this.listeners.get(key);
    return !!set && set.size > 0;
  }

  subscribe(key: string, fn: Listener): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(fn);
    return () => {
      set!.delete(fn);
    };
  }

  private emit(key: string): void {
    this.listeners.get(key)?.forEach((l) => l());
  }

  /**
   * Invalidate every key matching the prefix. Keys with live subscribers are
   * refetched immediately (so mounted views update in place); keys with no
   * subscribers are marked stale (updatedAt = 0) so they refetch on next mount.
   */
  invalidate(prefix: string): void {
    for (const key of [...this.store.keys()]) {
      if (key !== prefix && !key.startsWith(prefix)) continue;
      const fetcher = this.fetchers.get(key);
      if (this.hasSubscribers(key) && fetcher) {
        void this.fetch(key, fetcher, true);
      } else {
        const entry = this.store.get(key);
        if (entry) this.set(key, { ...entry, updatedAt: 0 });
      }
    }
    // A prefix may also match keys that were never stored yet but are mounted
    // (edge case): refetch any registered fetcher whose key matches and has subs.
    for (const key of [...this.fetchers.keys()]) {
      if ((key === prefix || key.startsWith(prefix)) && !this.store.has(key) && this.hasSubscribers(key)) {
        void this.fetch(key, this.fetchers.get(key)!, true);
      }
    }
  }

  async fetch<T>(key: string, fn: () => Promise<T>, force = false): Promise<void> {
    const existing = this.store.get(key) as Entry<T> | undefined;
    const fresh =
      existing && existing.status === "success" && Date.now() - existing.updatedAt < 50;
    if (!force && fresh) return;
    if (existing?.promise && existing.status === "loading") return existing.promise;

    const promise = (async () => {
      try {
        const data = await fn();
        this.set(key, { data, status: "success", updatedAt: Date.now() });
      } catch (e) {
        this.set(key, {
          error: e instanceof Error ? e : new Error(String(e)),
          status: "error",
          updatedAt: Date.now(),
        });
      }
    })();

    this.set(key, {
      ...(existing ?? { updatedAt: 0 }),
      status: "loading",
      promise,
    });
    return promise;
  }
}

const QueryContext = createContext<QueryCache | null>(null);

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => new QueryCache());
  return <QueryContext.Provider value={cache}>{children}</QueryContext.Provider>;
}

function useCache(): QueryCache {
  const cache = useContext(QueryContext);
  if (!cache) throw new Error("useQuery/useMutation must be used within QueryClientProvider");
  return cache;
}

export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useQuery<T>(
  key: string | null,
  fn: () => Promise<T>,
  options?: { enabled?: boolean },
): QueryResult<T> {
  const cache = useCache();
  const enabled = options?.enabled !== false && key !== null;
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || key === null) return;
    // Keep the cache's fetcher for this key current, so invalidate() can refetch.
    cache.registerFetcher(key, () => fnRef.current());
    const unsub = cache.subscribe(key, rerender);
    const entry = cache.get(key);
    if (!entry || entry.updatedAt === 0 || entry.status === "idle") {
      void cache.fetch(key, () => fnRef.current(), entry?.updatedAt === 0);
    }
    return unsub;
  }, [cache, key, enabled, rerender]);

  const entry = key ? (cache.get(key) as Entry<T> | undefined) : undefined;

  return {
    data: entry?.data,
    isLoading: !entry || entry.status === "loading" || entry.status === "idle",
    isError: entry?.status === "error",
    error: entry?.error,
    refetch: () => {
      if (key) void cache.fetch(key, () => fnRef.current(), true);
    },
  };
}

export interface MutationOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
  invalidateKeys?: string[];
}

export interface MutationResult<TData, TVars> {
  mutate: (vars: TVars) => void;
  mutateAsync: (vars: TVars) => Promise<TData>;
  isPending: boolean;
  error: Error | undefined;
}

export function useMutation<TData, TVars = void>(
  options: MutationOptions<TData, TVars>,
): MutationResult<TData, TVars> {
  const cache = useCache();
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(
    async (vars: TVars): Promise<TData> => {
      setPending(true);
      setError(undefined);
      try {
        const data = await optionsRef.current.mutationFn(vars);
        optionsRef.current.invalidateKeys?.forEach((k) => cache.invalidate(k));
        optionsRef.current.onSuccess?.(data, vars);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        optionsRef.current.onError?.(err, vars);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [cache],
  );

  return {
    mutate: (vars: TVars) => {
      void run(vars).catch(() => {});
    },
    mutateAsync: run,
    isPending,
    error,
  };
}
