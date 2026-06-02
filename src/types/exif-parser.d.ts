declare module 'exif-parser' {
  export interface ExifTag {
    Make?: string;
    Model?: string;
    FNumber?: number;
    ExposureTime?: number;
    ISO?: number;
    FocalLength?: number;
    DateTimeOriginal?: number;
    [tagName: string]: unknown;
  }

  export interface ExifResult {
    tags: ExifTag;
    imageSize?: {
      width: number;
      height: number;
    };
  }

  export interface ExifParser {
    parse(): ExifResult;
  }

  export function create(buffer: Buffer): ExifParser;
}
