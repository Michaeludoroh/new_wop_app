"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { announcementsApi } from "./api-client";
import {
  Announcement,
  AnnouncementCategoryOption,
  AnnouncementFeedQuery,
  AnnouncementFeedResponse,
  AnnouncementPayload
} from "./types";

type UseAnnouncementsFeedResult = {
  items: Announcement[];
  meta: AnnouncementFeedResponse["meta"];
  categories: AnnouncementCategoryOption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useAnnouncementsFeed(query?: AnnouncementFeedQuery): UseAnnouncementsFeedResult {
  const [items, setItems] = useState<Announcement[]>([]);
  const [meta, setMeta] = useState<AnnouncementFeedResponse["meta"]>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [categories, setCategories] = useState<AnnouncementCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryRef = useRef(query);
  queryRef.current = query;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feed, categoryOptions] = await Promise.all([
        announcementsApi.getFeed(queryRef.current),
        announcementsApi.getCategories()
      ]);
      setItems(feed.items);
      setMeta(feed.meta);
      setCategories(categoryOptions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load announcements";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(query ?? {})]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, meta, categories, loading, error, refresh };
}

type UseAnnouncementMutationResult = {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  save: (payload: AnnouncementPayload, id?: string) => Promise<Announcement | null>;
  publish: (id: string) => Promise<Announcement | null>;
  unpublish: (id: string) => Promise<Announcement | null>;
  remove: (id: string) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string | null>;
  clearStatus: () => void;
};

export function useAnnouncementMutation(
  onChanged?: () => void | Promise<void>
): UseAnnouncementMutationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const notifyChanged = useCallback(async () => {
    await onChangedRef.current?.();
  }, []);

  const save = useCallback(
    async (payload: AnnouncementPayload, id?: string): Promise<Announcement | null> => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const saved = id
          ? await announcementsApi.update(id, payload)
          : await announcementsApi.create(payload);
        setSuccessMessage(id ? "Announcement updated." : "Announcement saved.");
        await notifyChanged();
        return saved;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save announcement");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notifyChanged]
  );

  const publish = useCallback(
    async (id: string): Promise<Announcement | null> => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const published = await announcementsApi.publish(id);
        setSuccessMessage("Announcement published.");
        await notifyChanged();
        return published;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to publish announcement");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notifyChanged]
  );

  const unpublish = useCallback(
    async (id: string): Promise<Announcement | null> => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const draft = await announcementsApi.unpublish(id);
        setSuccessMessage("Announcement moved to drafts.");
        await notifyChanged();
        return draft;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unpublish announcement");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notifyChanged]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        await announcementsApi.remove(id);
        setSuccessMessage("Announcement deleted.");
        await notifyChanged();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete announcement");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [notifyChanged]
  );

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const uploaded = await announcementsApi.uploadImage(file);
      return uploaded.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return { loading, error, successMessage, save, publish, unpublish, remove, uploadImage, clearStatus };
}
