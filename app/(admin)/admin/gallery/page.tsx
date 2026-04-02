"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { galleryApi } from "@/app/lib/api";
import type { GalleryCategory, GalleryImage } from "@/app/types/gallery";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MAX_UPLOAD = 5;

export default function GalleryAdminPage() {
  const { showNotice } = useAppNotice();
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "edit">("create");
  const [categoryName, setCategoryName] = useState("");
  const [categorySort, setCategorySort] = useState("0");
  const [editCategory, setEditCategory] = useState<GalleryCategory | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<GalleryCategory | null>(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState<GalleryImage | null>(null);

  const [preview, setPreview] = useState<GalleryImage | null>(null);

  const loadCategories = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await galleryApi.listCategories();
      setCategories(res.categories);
      setSelectedId((prev) => {
        if (prev && res.categories.some((c) => c.id === prev)) return prev;
        return res.categories[0]?.id ?? null;
      });
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Failed to load categories",
        variant: "error",
      });
    } finally {
      setLoadingList(false);
    }
  }, [showNotice]);

  const loadImages = useCallback(
    async (categoryId: string) => {
      setLoadingImages(true);
      try {
        const res = await galleryApi.listImages(categoryId);
        setImages(res.images);
      } catch (e: unknown) {
        showNotice({
          message: e instanceof Error ? e.message : "Failed to load images",
          variant: "error",
        });
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    },
    [showNotice]
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedId) {
      void loadImages(selectedId);
    } else {
      setImages([]);
    }
  }, [selectedId, loadImages]);

  const openCreateCategory = () => {
    setCategoryModalMode("create");
    setEditCategory(null);
    setCategoryName("");
    setCategorySort("0");
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: GalleryCategory) => {
    setCategoryModalMode("edit");
    setEditCategory(c);
    setCategoryName(c.name);
    setCategorySort(String(c.sort_order));
    setCategoryModalOpen(true);
  };

  const submitCategoryModal = async () => {
    const name = categoryName.trim();
    if (!name) {
      showNotice({ title: "Name required", message: "Enter a category name.", variant: "info" });
      return;
    }
    const sort = Math.max(0, parseInt(categorySort, 10) || 0);
    try {
      if (categoryModalMode === "create") {
        const res = await galleryApi.createCategory({ name, sort_order: sort });
        showNotice({ message: res.message ?? "Category created", variant: "success" });
        setSelectedId(res.category.id);
      } else if (editCategory) {
        const res = await galleryApi.updateCategory(editCategory.id, { name, sort_order: sort });
        showNotice({ message: res.message ?? "Category updated", variant: "success" });
      }
      setCategoryModalOpen(false);
      await loadCategories();
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Save failed",
        variant: "error",
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    try {
      await galleryApi.deleteCategory(deleteCategoryTarget.id);
      if (selectedId === deleteCategoryTarget.id) setSelectedId(null);
      setDeleteCategoryTarget(null);
      showNotice({ message: "Category deleted", variant: "success" });
      await loadCategories();
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Delete failed",
        variant: "error",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedId) return;
    const selected = e.target.files;
    if (!selected?.length) return;
    const files = Array.from(selected);
    if (files.length > MAX_UPLOAD) {
      showNotice({
        title: "Too many files",
        message: `Select at most ${MAX_UPLOAD} images per upload.`,
        variant: "info",
      });
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const res = await galleryApi.uploadBulk(selectedId, files);
      showNotice({
        title: "Upload complete",
        message: res.message ?? `${res.images.length} image(s) uploaded.`,
        variant: "success",
      });
      await loadImages(selectedId);
      await loadCategories();
    } catch (err: unknown) {
      showNotice({
        message: err instanceof Error ? err.message : "Upload failed",
        variant: "error",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteImageTarget || !selectedId) return;
    try {
      await galleryApi.deleteImage(deleteImageTarget.id);
      setDeleteImageTarget(null);
      showNotice({ message: "Image deleted", variant: "success" });
      await loadImages(selectedId);
      await loadCategories();
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Delete failed",
        variant: "error",
      });
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Website gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create categories for the public Gallery page. Upload up to {MAX_UPLOAD} images at a time (images only,
            max ~50&nbsp;MB each). The marketing site loads photos when visitors pick a category.
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={openCreateCategory}>
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </div>

      {loadingList ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-lg loading-spinner" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <Images className="mx-auto h-12 w-12 text-muted-foreground opacity-70" />
          <p className="mt-4 font-medium text-foreground">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a category, then upload photos. They will appear on the public gallery.
          </p>
          <Button type="button" className="mt-6 gap-2" onClick={openCreateCategory}>
            <Plus className="h-4 w-4" />
            Create first category
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
          <aside className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <ul className="space-y-1">
              {categories.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <div
                      className={`flex flex-col gap-1 rounded-lg border px-2 py-2 transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left text-sm font-semibold text-foreground"
                        onClick={() => setSelectedId(c.id)}
                      >
                        {c.name}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({c.images_count})
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs gap-1"
                          onClick={() => openEditCategory(c)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteCategoryTarget(c)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedCategory?.name ?? "Category"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory?.images_count ?? 0} photo
                  {(selectedCategory?.images_count ?? 0) === 1 ? "" : "s"} · lower sort order shows first on the
                  public site
                </p>
              </div>
              {selectedId ? (
                <label className="btn btn-primary inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? "Uploading…" : `Upload images (max ${MAX_UPLOAD})`}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                </label>
              ) : null}
            </div>

            {loadingImages ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-lg loading-spinner" />
              </div>
            ) : images.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
                No images in this category. Use upload to add up to {MAX_UPLOAD} files per batch.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="card overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                  >
                    <button
                      type="button"
                      className="relative aspect-square w-full bg-muted"
                      onClick={() => setPreview(img)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.original_name || ""}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <div className="space-y-2 border-t border-border p-3">
                      <p className="truncate text-xs text-muted-foreground" title={img.original_name ?? ""}>
                        {img.original_name || "Image"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setPreview(img)}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setDeleteImageTarget(img)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{categoryModalMode === "create" ? "New category" : "Edit category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="form-control gap-2">
              <label className="label">
                <span className="label-text font-medium">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Graduation 2025"
              />
            </div>
            <div className="form-control gap-2">
              <label className="label">
                <span className="label-text font-medium">Sort order</span>
              </label>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={categorySort}
                onChange={(e) => setCategorySort(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Smaller numbers appear first in the public gallery tabs.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitCategoryModal}>
                {categoryModalMode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.original_name || "Image"}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="max-h-[75vh] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.original_name || ""}
                className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        title="Delete category?"
        description={
          deleteCategoryTarget ? (
            <>
              Remove <span className="font-medium text-foreground">{deleteCategoryTarget.name}</span> and all of its
              images. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={handleDeleteCategory}
      />

      <ConfirmDialog
        open={!!deleteImageTarget}
        title="Delete image?"
        description="This file will be removed from storage permanently."
        confirmLabel="Delete"
        onClose={() => setDeleteImageTarget(null)}
        onConfirm={handleDeleteImage}
      />
    </div>
  );
}
