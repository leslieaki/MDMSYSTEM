export type PartDrawingFile = {
  id: number;
  partId: number;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
};