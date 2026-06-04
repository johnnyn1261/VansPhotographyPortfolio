import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

export interface Folder {
  slug: string;
  name: string;
  description?: string;
}

export interface Category {
  slug: string;
  name: string;
  description?: string;
  folderSlug?: string;
}

export interface Photo {
  id: string;
  filename: string;
  url: string;
  title: string;
  description?: string;
  category: string;
  width: number;
  height: number;
  dateAdded: string;
  order: number;
  favorite?: boolean;
  blurDataURL?: string;
  
  // EXIF Metadata tags
  camera?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  focalLength?: string;
  dateTaken?: string;
}

export interface PortfolioMetadata {
  folders?: Folder[];
  categories: Category[];
  images: Photo[];
}

const defaultMetadata: PortfolioMetadata = {
  folders: [],
  categories: [
    { slug: "landscapes", name: "Landscapes", description: "Scenic beauty, mountains, seascapes, and natural wonders." },
    { slug: "portraits", name: "Portraits", description: "Human stories, expressions, studio work, and editorial." },
    { slug: "street", name: "Street & Urban", description: "Candid moments, city life, architecture, and nightscapes." }
  ],
  images: []
};

let s3ClientInstance: S3Client | null = null;
const getS3Client = (): S3Client => {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    });
  }
  return s3ClientInstance;
};

const getLocalPaths = () => {
  const mockDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "mock");
  const uploadsDir = path.join(mockDir, "uploads");
  const jsonPath = path.join(mockDir, "portfolio.json");

  // Ensure directories exist
  if (!fs.existsSync(mockDir)) {
    fs.mkdirSync(mockDir, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  return { jsonPath, uploadsDir };
};

export async function getPortfolioMetadata(): Promise<PortfolioMetadata> {
  const mode = process.env.STORAGE_MODE || "local";
  let metadata: PortfolioMetadata;

  if (mode === "aws") {
    try {
      const s3 = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: "portfolio.json"
      });
      const response = await s3.send(command);
      const dataStr = await response.Body?.transformToString();
      if (!dataStr) {
        metadata = defaultMetadata;
      } else {
        metadata = JSON.parse(dataStr) as PortfolioMetadata;
        if (!metadata.folders) {
          metadata.folders = [];
        }
      }
    } catch (err) {
      const error = err as { name?: string; code?: string };
      if (error.name === "NoSuchKey" || error.code === "NoSuchKey") {
        // Automatically seed with defaultMetadata
        await savePortfolioMetadata(defaultMetadata);
        metadata = defaultMetadata;
      } else {
        console.error("AWS S3 fetching error. Falling back to default data:", err);
        metadata = defaultMetadata;
      }
    }
  } else {
    const { jsonPath } = getLocalPaths();
    if (!fs.existsSync(jsonPath)) {
      await savePortfolioMetadata(defaultMetadata);
      metadata = defaultMetadata;
    } else {
      try {
        const fileData = await fs.promises.readFile(jsonPath, "utf-8");
        metadata = JSON.parse(fileData) as PortfolioMetadata;
        if (!metadata.folders) {
          metadata.folders = [];
        }
      } catch (err) {
        console.error("Local mock loading error:", err);
        metadata = defaultMetadata;
      }
    }
  }

  return metadata;
}

export async function savePortfolioMetadata(metadata: PortfolioMetadata): Promise<void> {
  const mode = process.env.STORAGE_MODE || "local";

  if (mode === "aws") {
    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: "portfolio.json",
      Body: JSON.stringify(metadata, null, 2),
      ContentType: "application/json",
      CacheControl: "no-cache"
    });
    await s3.send(command);
  } else {
    const { jsonPath } = getLocalPaths();
    await fs.promises.writeFile(jsonPath, JSON.stringify(metadata, null, 2), "utf-8");
  }
}

export interface UploadUrlResponse {
  uploadUrl: string; // The URL to PUT/POST to
  key: string;       // S3 key or file identifier
  publicUrl: string; // Public-facing URL (CDN or local path)
}

export async function getUploadUrl(filename: string, fileType: string): Promise<UploadUrlResponse> {
  const mode = process.env.STORAGE_MODE || "local";
  
  // Clean filename to prevent weird characters and inject timestamp for uniqueness
  const cleanName = filename.toLowerCase().replace(/[^a-z0-9.-]/g, "_");
  const uniqueName = `${Date.now()}-${cleanName}`;

  if (mode === "aws") {
    const s3 = getS3Client();
    const key = `uploads/${uniqueName}`;
    const bucketName = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
      CacheControl: "public, max-age=31536000, immutable"
    });

    // Generate signed URL valid for 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // Determine CloudFront vs S3 public URL
    let publicUrl = "";
    if (process.env.CLOUDFRONT_DOMAIN) {
      const cleanCfDomain = process.env.CLOUDFRONT_DOMAIN.replace(/\/$/, "");
      publicUrl = `${cleanCfDomain}/${key}`;
    } else {
      publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }

    return { uploadUrl, key, publicUrl };
  } else {
    // Local Mode
    // The key is the mock relative path
    const key = uniqueName;
    const uploadUrl = `/api/admin/upload?filename=${uniqueName}`;
    const publicUrl = `/mock/uploads/${uniqueName}`;

    return { uploadUrl, key, publicUrl };
  }
}

export async function deleteFile(key: string): Promise<void> {
  const mode = process.env.STORAGE_MODE || "local";

  if (mode === "aws") {
    const s3 = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    await s3.send(command);
  } else {
    const { uploadsDir } = getLocalPaths();
    const filePath = path.join(uploadsDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
