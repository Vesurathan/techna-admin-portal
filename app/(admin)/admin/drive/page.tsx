"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  FolderPlus,
  FolderOpen,
  Pencil,
  Trash2,
  Upload,
  Eye,
  ArrowLeft,
  Files,
  File,
  ExternalLink,
} from "lucide-react";
import { photoLibraryApi } from "@/app/lib/api";
import {
  isImageLikeFile,
  type PhotoFolder,
  type PhotoLibraryFile,
} from "@/app/types/photo-library";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Crumb = { id: string | null; name: string };

export default function DrivePage() {
  const { showNotice } = useAppNotice();
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "Drive" }]);
  const currentFolderId = crumbs[crumbs.length - 1]?.id ?? null;

  const [folders, setFolders] = useState<PhotoFolder[]>([]);
  const [files, setFiles] = useState<PhotoLibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">("create");
  const [folderNameInput, setFolderNameInput] = useState("");
  const [renameTarget, setRenameTarget] = useState<PhotoFolder | null>(null);

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<PhotoFolder | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<PhotoLibraryFile | null>(null);
  const [previewFile, setPreviewFile] = useState<PhotoLibraryFile | null>(null);

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const foldersRes = await photoLibraryApi.listFolders(currentFolderId);
      setFolders(foldersRes.folders);
      if (currentFolderId) {
        const filesRes = await photoLibraryApi.listFiles(currentFolderId);
        setFiles(filesRes.files);
      } else {
        setFiles([]);
      }
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Failed to load Drive",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, showNotice]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const enterFolder = (folder: PhotoFolder) => {
    setCrumbs((c) => [...c, { id: folder.id, name: folder.name }]);
  };

  const goToCrumb = (index: number) => {
    setCrumbs((c) => c.slice(0, index + 1));
  };

  const openCreateFolder = () => {
    setFolderModalMode("create");
    setRenameTarget(null);
    setFolderNameInput("");
    setFolderModalOpen(true);
  };

  const openRenameFolder = (folder: PhotoFolder) => {
    setFolderModalMode("rename");
    setRenameTarget(folder);
    setFolderNameInput(folder.name);
    setFolderModalOpen(true);
  };

  const submitFolderModal = async () => {
    const name = folderNameInput.trim();
    if (!name) {
      showNotice({ title: "Name required", message: "Enter a folder name.", variant: "info" });
      return;
    }
    try {
      if (folderModalMode === "create") {
        await photoLibraryApi.createFolder({
          name,
          parent_id: currentFolderId,
        });
        showNotice({ message: "Folder created", variant: "success" });
      } else if (renameTarget) {
        await photoLibraryApi.updateFolder(renameTarget.id, name);
        showNotice({ message: "Folder renamed", variant: "success" });
        setCrumbs((c) =>
          c.map((cr) => (cr.id === renameTarget.id ? { ...cr, name } : cr))
        );
      }
      setFolderModalOpen(false);
      await loadContents();
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Folder save failed",
        variant: "error",
      });
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await photoLibraryApi.deleteFolder(deleteFolderTarget.id);
      setDeleteFolderTarget(null);
      setCrumbs((c) => c.filter((cr) => cr.id !== deleteFolderTarget.id));
      await loadContents();
      showNotice({ message: "Folder deleted", variant: "success" });
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Failed to delete folder",
        variant: "error",
      });
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileTarget) return;
    try {
      await photoLibraryApi.deleteFile(deleteFileTarget.id);
      setDeleteFileTarget(null);
      await loadContents();
      showNotice({ message: "File deleted", variant: "success" });
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Failed to delete file",
        variant: "error",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentFolderId) return;
    const selected = e.target.files;
    if (!selected?.length) return;
    setUploading(true);
    let ok = 0;
    try {
      for (let i = 0; i < selected.length; i++) {
        await photoLibraryApi.uploadFile(currentFolderId, selected[i]);
        ok += 1;
      }
      showNotice({
        title: "Upload complete",
        message: `${ok} file${ok === 1 ? "" : "s"} uploaded.`,
        variant: "success",
      });
      await loadContents();
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

  const toggleFileActive = async (file: PhotoLibraryFile, next: boolean) => {
    try {
      await photoLibraryApi.updateFile(file.id, next);
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, is_active: next } : f))
      );
    } catch (e: unknown) {
      showNotice({
        message: e instanceof Error ? e.message : "Update failed",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Drive</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize folders (names are unique per location), upload any file type, and mark items active
            or inactive.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={openCreateFolder}>
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
          {currentFolderId ? (
            <label className="btn btn-primary inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
              <Upload className="h-4 w-4" />
              <span>{uploading ? "Uploading…" : "Upload files"}</span>
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((cr, i) => (
          <span key={`${cr.id ?? "root"}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-4 w-4 shrink-0 opacity-60" /> : null}
            <button
              type="button"
              className={
                i === crumbs.length - 1
                  ? "font-medium text-foreground"
                  : "hover:text-foreground hover:underline"
              }
              onClick={() => goToCrumb(i)}
            >
              {cr.name}
            </button>
          </span>
        ))}
      </nav>

      {currentFolderId ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => goToCrumb(crumbs.length - 2)}
        >
          <ArrowLeft className="h-4 w-4" />
          Up to parent
        </Button>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-lg loading-spinner" />
        </div>
      ) : (
        <>
          {folders.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Folders
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="card flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-start gap-3 text-left transition-opacity hover:opacity-90"
                      onClick={() => enterFolder(f)}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderOpen className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{f.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {f.children_count} subfolder{f.children_count === 1 ? "" : "s"} ·{" "}
                          {f.files_count} file{f.files_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1"
                        onClick={() => openRenameFolder(f)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteFolderTarget(f)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {currentFolderId && files.length > 0 ? (
            <section className={folders.length > 0 ? "mt-10" : "mt-4"}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Files className="h-4 w-4" />
                Files in this folder
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`card overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-border ${
                      file.is_active ? "" : "opacity-70 ring-muted"
                    }`}
                  >
                    <button
                      type="button"
                      className="relative flex aspect-square w-full items-center justify-center bg-muted"
                      onClick={() => setPreviewFile(file)}
                    >
                      {isImageLikeFile(file) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={file.url}
                          alt={file.original_name || "File preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-4 text-muted-foreground">
                          <File className="h-14 w-14 opacity-60" strokeWidth={1.25} />
                          <span className="max-w-full truncate px-2 text-xs font-medium text-foreground">
                            {file.original_name || "File"}
                          </span>
                        </div>
                      )}
                      {!file.is_active ? (
                        <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                    </button>
                    <div className="space-y-2 border-t border-border p-3">
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={file.original_name ?? ""}
                      >
                        {file.original_name || "Untitled"}
                      </p>
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-medium">
                        <span>Active</span>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={file.is_active}
                          onChange={(e) => toggleFileActive(file, e.target.checked)}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs flex-1 gap-1"
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs flex-1 gap-1 text-destructive"
                          onClick={() => setDeleteFileTarget(file)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {folderModalMode === "create" ? "New folder" : "Rename folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="form-control gap-2">
              <label className="label">
                <span className="label-text font-medium">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Folder name"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Folder names must be unique within the same parent (no duplicate names next to each other).
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFolderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitFolderModal}>
                {folderModalMode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewFile?.original_name || "File"}
            </DialogTitle>
          </DialogHeader>
          {previewFile ? (
            <div className="space-y-4">
              {isImageLikeFile(previewFile) ? (
                <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewFile.url}
                    alt={previewFile.original_name || ""}
                    className="mx-auto max-h-[65vh] w-auto max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/30 px-6 py-12">
                  <File className="h-16 w-16 text-muted-foreground" strokeWidth={1.25} />
                  <p className="text-center text-sm text-muted-foreground">
                    Preview isn&apos;t available for this file type. Open it in a new tab to download or
                    view with your device.
                  </p>
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => window.open(previewFile.url, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open file
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteFolderTarget}
        title="Delete folder?"
        description={
          deleteFolderTarget ? (
            <>
              Remove <span className="font-medium text-foreground">{deleteFolderTarget.name}</span> and
              everything inside (subfolders and files). This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
      />

      <ConfirmDialog
        open={!!deleteFileTarget}
        title="Delete file?"
        description="This file will be removed from storage permanently."
        confirmLabel="Delete"
        onClose={() => setDeleteFileTarget(null)}
        onConfirm={handleDeleteFile}
      />
    </div>
  );
}
