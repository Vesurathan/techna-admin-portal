export interface PhotoFolder {
  id: string;
  name: string;
  parent_id: string | null;
  files_count: number;
  children_count: number;
}

export interface PhotoLibraryFile {
  id: string;
  photo_folder_id: string;
  url: string;
  original_name: string | null;
  mime_type: string | null;
  is_active: boolean;
  created_at?: string;
}

/** True when the file can be previewed as an image in the browser. */
export function isImageLikeFile(f: PhotoLibraryFile): boolean {
  if (f.mime_type?.startsWith("image/")) return true;
  const name = f.original_name || "";
  return /\.(jpe?g|png|gif|webp|bmp|svg|avif|ico)$/i.test(name);
}
