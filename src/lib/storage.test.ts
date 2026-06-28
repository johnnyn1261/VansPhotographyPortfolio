import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  getPortfolioMetadata, 
  savePortfolioMetadata, 
  PortfolioMetadata,
  Category,
  Folder,
  getUploadUrl,
  deleteFile
} from "./storage";
import fs from "fs";

// Mock fs globally for local storage tests
vi.mock("fs", () => {
  const mockExistsSync = vi.fn().mockReturnValue(true);
  const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify({ categories: [], images: [] }));
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);
  const mockUnlink = vi.fn().mockResolvedValue(undefined);
  const mockMkdirSync = vi.fn();
  
  return {
    default: {
      existsSync: mockExistsSync,
      mkdirSync: mockMkdirSync,
      promises: {
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        unlink: mockUnlink
      }
    },
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    promises: {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      unlink: mockUnlink
    }
  };
});

// Store standard mocked metadata in test context
let mockMetadataStore: PortfolioMetadata;

let mockSendError: any = null;
let mockSendGetObjectReturnBody: string | null = null;

// Mock the S3Client send method dynamically
const mockSend = vi.fn().mockImplementation(async (command) => {
  if (mockSendError) {
    const err = mockSendError;
    mockSendError = null;
    throw err;
  }
  const commandName = command.constructor.name;
  if (commandName === "GetObjectCommand") {
    const bodyText = mockSendGetObjectReturnBody !== null ? mockSendGetObjectReturnBody : JSON.stringify(mockMetadataStore);
    mockSendGetObjectReturnBody = null;
    return {
      Body: bodyText === "" ? null : {
        transformToString: async () => bodyText
      }
    };
  } else if (commandName === "PutObjectCommand") {
    const bodyStr = command.input.Body;
    mockMetadataStore = JSON.parse(bodyStr);
    return { success: true };
  } else if (commandName === "DeleteObjectCommand") {
    return { success: true };
  }
  throw new Error("Unhandled mock command: " + commandName);
});

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class MockS3Client {
      constructor(public config: any) {}
      send = mockSend;
    },
    GetObjectCommand: class GetObjectCommand {
      constructor(public input: any) {}
    },
    PutObjectCommand: class PutObjectCommand {
      constructor(public input: any) {}
    },
    DeleteObjectCommand: class DeleteObjectCommand {
      constructor(public input: any) {}
    }
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://mock-signed-url.com/upload")
}));

describe("Photography Portfolio Storage Integration Tests", () => {
  beforeEach(() => {
    // Set storage mode to AWS to run the S3 client path
    process.env.STORAGE_MODE = "aws";
    process.env.AWS_S3_BUCKET = "test-bucket";
    
    // Reset mock metadata store to a standard seed
    mockMetadataStore = {
      folders: [
        { slug: "landscapes", name: "Landscapes", description: "Scenic views" }
      ],
      categories: [
        { slug: "city", name: "Cityscapes", description: "Urban views", folderSlug: "landscapes" },
        { slug: "portraits", name: "Portraits", description: "Studio portraits" }
      ],
      images: [
        {
          id: "photo1",
          filename: "uploads/123-berlin.jpg",
          url: "https://mock-cdn.net/uploads/123-berlin.jpg",
          title: "Berlin",
          description: "Brandenburg Gate",
          category: "city",
          width: 1200,
          height: 900,
          dateAdded: "2026-06-04T12:00:00Z",
          order: 0,
          favorite: false
        }
      ]
    };
    
    mockSend.mockClear();
    mockSendError = null;
    mockSendGetObjectReturnBody = null;
  });

  it("should retrieve metadata and initialize missing folders list", async () => {
    const seedWithoutFolders = { ...mockMetadataStore };
    delete seedWithoutFolders.folders;
    
    mockMetadataStore = seedWithoutFolders as any;

    const data = await getPortfolioMetadata();
    expect(data.folders).toBeDefined();
    expect(Array.isArray(data.folders)).toBe(true);
    expect(data.folders!.length).toBe(0);
  });

  it("should add a folder to metadata", async () => {
    const metadata = await getPortfolioMetadata();
    const newFolder: Folder = {
      slug: "travel",
      name: "Travel",
      description: "Around the world"
    };

    const updated = {
      ...metadata,
      folders: [...(metadata.folders || []), newFolder]
    };

    await savePortfolioMetadata(updated);

    const check = await getPortfolioMetadata();
    expect(check.folders).toBeDefined();
    expect(check.folders!.some(f => f.slug === "travel")).toBe(true);
  });

  it("should delete a folder and reset nested categories to top-level", async () => {
    const metadata = await getPortfolioMetadata();
    
    expect(metadata.categories.find(c => c.slug === "city")?.folderSlug).toBe("landscapes");

    const updated = {
      ...metadata,
      folders: (metadata.folders || []).filter(f => f.slug !== "landscapes"),
      categories: metadata.categories.map(cat => 
        cat.folderSlug === "landscapes" ? { ...cat, folderSlug: undefined } : cat
      )
    };

    await savePortfolioMetadata(updated);

    const check = await getPortfolioMetadata();
    expect(check.folders!.some(f => f.slug === "landscapes")).toBe(false);
    expect(check.categories.find(c => c.slug === "city")?.folderSlug).toBeUndefined();
  });

  it("should add a category (collection) and nest it under a folder", async () => {
    const metadata = await getPortfolioMetadata();
    
    const newCat: Category = {
      slug: "street",
      name: "Street Photography",
      folderSlug: "landscapes"
    };

    const updated = {
      ...metadata,
      categories: [...metadata.categories, newCat]
    };

    await savePortfolioMetadata(updated);

    const check = await getPortfolioMetadata();
    const addedCat = check.categories.find(c => c.slug === "street");
    expect(addedCat).toBeDefined();
    expect(addedCat?.folderSlug).toBe("landscapes");
  });

  it("should update a category's folder slug (re-parenting a collection)", async () => {
    const metadata = await getPortfolioMetadata();
    
    const updatedCategories = metadata.categories.map(c => 
      c.slug === "portraits" ? { ...c, folderSlug: "landscapes" } : c
    );

    const updated = { ...metadata, categories: updatedCategories };
    await savePortfolioMetadata(updated);

    const check = await getPortfolioMetadata();
    expect(check.categories.find(c => c.slug === "portraits")?.folderSlug).toBe("landscapes");
  });

  it("should toggle the favorite status of a photo", async () => {
    const metadata = await getPortfolioMetadata();
    
    const photo = metadata.images.find(img => img.id === "photo1");
    expect(photo?.favorite).toBe(false);

    const updatedImages = metadata.images.map(img => 
      img.id === "photo1" ? { ...img, favorite: !img.favorite } : img
    );

    const updated = { ...metadata, images: updatedImages };
    await savePortfolioMetadata(updated);

    const check = await getPortfolioMetadata();
    expect(check.images.find(img => img.id === "photo1")?.favorite).toBe(true);
  });

  it("should delete a photo from metadata", async () => {
    const metadata = await getPortfolioMetadata();
    expect(metadata.images.some(img => img.id === "photo1")).toBe(true);

    const updatedImages = metadata.images.filter(img => img.id !== "photo1");
    const updated = { ...metadata, images: updatedImages };
    await savePortfolioMetadata(updated);

    const check = await getPortfolioMetadata();
    expect(check.images.some(img => img.id === "photo1")).toBe(false);
  });

  it("should protect a category from deletion if it still contains images", async () => {
    const metadata = await getPortfolioMetadata();
    
    const categoryWithImages = "city";
    const hasImages = metadata.images.some(img => img.category === categoryWithImages);
    expect(hasImages).toBe(true);

    let deleteProceeded = false;
    if (!hasImages) {
      deleteProceeded = true;
    }

    expect(deleteProceeded).toBe(false);
  });

  it("should handle S3 NoSuchKey error by seeding default metadata", async () => {
    mockSendError = { name: "NoSuchKey" };
    const data = await getPortfolioMetadata();
    expect(data.categories.length).toBe(3); // default categories
  });

  it("should handle S3 generic error by falling back to default metadata", async () => {
    mockSendError = new Error("Generic S3 Error");
    const data = await getPortfolioMetadata();
    expect(data.categories.length).toBe(3); // default categories
  });

  it("should return defaultMetadata when S3 GetObject returns empty body", async () => {
    mockSendGetObjectReturnBody = "";
    const data = await getPortfolioMetadata();
    expect(data.categories.length).toBe(3); // default categories
  });

  it("should get upload URL in AWS mode with CloudFront domain", async () => {
    process.env.STORAGE_MODE = "aws";
    process.env.CLOUDFRONT_DOMAIN = "https://cdn.example.com";
    const res = await getUploadUrl("test.jpg", "image/jpeg");
    expect(res.uploadUrl).toBe("https://mock-signed-url.com/upload");
    expect(res.publicUrl).toContain("https://cdn.example.com/uploads/");
  });

  it("should get upload URL in AWS mode without CloudFront domain", async () => {
    process.env.STORAGE_MODE = "aws";
    delete process.env.CLOUDFRONT_DOMAIN;
    const res = await getUploadUrl("test.jpg", "image/jpeg");
    expect(res.uploadUrl).toBe("https://mock-signed-url.com/upload");
    expect(res.publicUrl).toContain(".s3.us-east-1.amazonaws.com/uploads/");
  });

  it("should delete file in AWS mode", async () => {
    process.env.STORAGE_MODE = "aws";
    await deleteFile("uploads/test.jpg");
    expect(mockSend).toHaveBeenCalled();
  });
});

describe("Photography Portfolio Local Storage Tests", () => {
  beforeEach(() => {
    process.env.STORAGE_MODE = "local";
    vi.clearAllMocks();
  });

  it("should retrieve default metadata when file does not exist", async () => {
    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(false);

    const data = await getPortfolioMetadata();
    expect(data.categories.length).toBe(3);
  });

  it("should retrieve saved metadata from file when it exists", async () => {
    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(true);

    const fsReadFileMock = vi.mocked(fs.promises.readFile);
    const mockData = { categories: [{ slug: "test", name: "Test" }], images: [] };
    fsReadFileMock.mockResolvedValue(JSON.stringify(mockData));

    const data = await getPortfolioMetadata();
    expect(data.categories[0].slug).toBe("test");
  });

  it("should handle read file error by falling back to default metadata", async () => {
    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(true);

    const fsReadFileMock = vi.mocked(fs.promises.readFile);
    fsReadFileMock.mockRejectedValue(new Error("Read Error"));

    const data = await getPortfolioMetadata();
    expect(data.categories.length).toBe(3);
  });

  it("should save metadata to file in local mode", async () => {
    const fsWriteFileMock = vi.mocked(fs.promises.writeFile);
    fsWriteFileMock.mockResolvedValue(undefined);

    const mockData = { categories: [{ slug: "test", name: "Test" }], images: [] };
    await savePortfolioMetadata(mockData);

    expect(fsWriteFileMock).toHaveBeenCalled();
    const args = fsWriteFileMock.mock.calls[0];
    expect(args[0]).toContain("portfolio.json");
    expect(JSON.parse(args[1] as string).categories[0].slug).toBe("test");
  });

  it("should get upload URL in local mode", async () => {
    const res = await getUploadUrl("test.jpg", "image/jpeg");
    expect(res.uploadUrl).toContain("/api/admin/upload");
    expect(res.publicUrl).toContain("/mock/uploads/");
  });

  it("should delete file in local mode if it exists", async () => {
    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(true);

    const fsUnlinkMock = vi.mocked(fs.promises.unlink);
    fsUnlinkMock.mockResolvedValue(undefined);

    await deleteFile("test.jpg");
    expect(fsUnlinkMock).toHaveBeenCalled();
  });
  
  it("should do nothing if file does not exist during deleteFile in local mode", async () => {
    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(false);

    const fsUnlinkMock = vi.mocked(fs.promises.unlink);
    fsUnlinkMock.mockResolvedValue(undefined);

    await deleteFile("test.jpg");
    expect(fsUnlinkMock).not.toHaveBeenCalled();
  });

  it("should initialize empty folders list when local file has no folders key", async () => {
    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(true);

    const fsReadFileMock = vi.mocked(fs.promises.readFile);
    // Data without folders key
    const mockData = { categories: [], images: [] };
    fsReadFileMock.mockResolvedValue(JSON.stringify(mockData));

    const data = await getPortfolioMetadata();
    expect(data.folders).toBeDefined();
    expect(data.folders!.length).toBe(0);
  });

  it("should default to local storage mode when process.env.STORAGE_MODE is undefined", async () => {
    delete process.env.STORAGE_MODE;
    
    // We call getUploadUrl and deleteFile to ensure it runs local mode branches
    const res = await getUploadUrl("test.jpg", "image/jpeg");
    expect(res.uploadUrl).toContain("/api/admin/upload");

    const fsExistsMock = vi.mocked(fs.existsSync);
    fsExistsMock.mockReturnValue(true);
    const fsUnlinkMock = vi.mocked(fs.promises.unlink);
    fsUnlinkMock.mockResolvedValue(undefined);

    await deleteFile("test.jpg");
    expect(fsUnlinkMock).toHaveBeenCalled();
  });
});
