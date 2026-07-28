"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { ROUTES } from "@/constants/routes";
import {
  emptyProjectInput,
  prepareProjectInput,
  projectToInput,
} from "@/features/admin-dev-projects/_lib/project-form-data";
import { imagePaths, removeUnreferencedImages } from "@/features/image-upload/_lib/asset-lifecycle";
import { devProjects, type DevProjectInput } from "@/lib/firebase/dev";
import type { DevProject } from "@/types/dev";
import type { ImageMeta } from "@/types/image";
import type { SiteLink } from "@/types/site";

type LocalizedArrayKey = "features" | "roles" | "achievements";

const useProjectEditor = (projectId: string, initial?: DevProject) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<DevProjectInput>(() =>
    initial ? projectToInput(initial) : emptyProjectInput(),
  );
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const initialPaths = useRef(new Set(imagePaths([initial?.cover, ...(initial?.images ?? [])])));
  const uploadedPaths = useRef(new Set<string>());

  const patch = (next: Partial<DevProjectInput>) =>
    setForm((previous) => ({ ...previous, ...next }));
  const addLocalized = (key: LocalizedArrayKey) =>
    setForm((previous) => ({
      ...previous,
      [key]: [...previous[key], { ko: "", en: "" }],
    }));
  const editLocalized = (
    key: LocalizedArrayKey,
    index: number,
    field: "ko" | "en",
    value: string,
  ) =>
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  const removeLocalized = (key: LocalizedArrayKey, index: number) =>
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].filter((_, itemIndex) => itemIndex !== index),
    }));

  const addTag = () => {
    const value = tagDraft.trim();
    if (!value || form.techTags.includes(value)) {
      setTagDraft("");
      return;
    }
    setForm((previous) => ({ ...previous, techTags: [...previous.techTags, value] }));
    setTagDraft("");
  };
  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTag();
  };
  const removeTag = (tag: string) =>
    setForm((previous) => ({
      ...previous,
      techTags: previous.techTags.filter((item) => item !== tag),
    }));

  const addLink = () =>
    setForm((previous) => ({
      ...previous,
      links: [...previous.links, { label: "", href: "" }],
    }));
  const editLink = (index: number, field: keyof SiteLink, value: string) =>
    setForm((previous) => ({
      ...previous,
      links: previous.links.map((link, itemIndex) =>
        itemIndex === index ? { ...link, [field]: value } : link,
      ),
    }));
  const removeLink = (index: number) =>
    setForm((previous) => ({
      ...previous,
      links: previous.links.filter((_, itemIndex) => itemIndex !== index),
    }));

  const trackUploads = (images: Array<ImageMeta | null>) => {
    for (const path of imagePaths(images)) {
      if (!initialPaths.current.has(path)) uploadedPaths.current.add(path);
    }
  };
  const onCoverChange = (cover: ImageMeta | null) => {
    trackUploads([cover]);
    patch({ cover });
  };
  const onImagesChange = (images: ImageMeta[]) => {
    trackUploads(images);
    patch({ images });
  };
  const onUploadPendingChange = useCallback((pending: boolean) => setUploading(pending), []);
  const cancel = async () => {
    await removeUnreferencedImages(uploadedPaths.current, []).catch(() => undefined);
    router.replace(ROUTES.ADMIN_DEV_PROJECTS);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.title.ko.trim()) {
      setError("제목(한국어)을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      const input = prepareProjectInput(form);
      if (isEdit) await devProjects.update(projectId, input);
      else await devProjects.create(projectId, input);
      await removeUnreferencedImages(
        [...initialPaths.current, ...uploadedPaths.current],
        imagePaths([input.cover, ...input.images]),
      ).catch(() => undefined);
      router.replace(ROUTES.ADMIN_DEV_PROJECTS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return {
    form,
    isEdit,
    tagDraft,
    setTagDraft,
    error,
    saving,
    uploading,
    patch,
    addLocalized,
    editLocalized,
    removeLocalized,
    addTag,
    onTagKeyDown,
    removeTag,
    addLink,
    editLink,
    removeLink,
    onCoverChange,
    onImagesChange,
    onUploadPendingChange,
    cancel,
    submit,
  };
};

export { useProjectEditor };
export type { LocalizedArrayKey };
