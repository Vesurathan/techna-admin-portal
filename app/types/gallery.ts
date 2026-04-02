export interface GalleryCategory {
  id: string;
  name: string;
  sort_order: number;
  images_count: number;
}

export interface GalleryImage {
  id: string;
  gallery_category_id: string;
  url: string;
  original_name: string | null;
  mime_type: string | null;
  created_at?: string | null;
}
