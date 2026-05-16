export type SaveDrawingFileInput = {
  partId: number;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

export type SavedDrawingFile = {
  originalName: string;
  storedName: string;
  storagePath: string;
  sizeBytes: number;
};

export interface DrawingFileStorage {
  save(input: SaveDrawingFileInput): Promise<SavedDrawingFile>;
  delete(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
}