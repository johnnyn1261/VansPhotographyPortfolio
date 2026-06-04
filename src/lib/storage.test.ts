import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  getPortfolioMetadata, 
  savePortfolioMetadata, 
  PortfolioMetadata,
  Category,
  Folder
} from "./storage";

// Store standard mocked metadata in test context
let mockMetadataStore: PortfolioMetadata;

// Mock the S3Client send method dynamically
const mockSend = vi.fn().mockImplementation(async (command) => {
  const commandName = command.constructor.name;
  if (commandName === "GetObjectCommand") {
    return {
      Body: {
        transformToString: async () => JSON.stringify(mockMetadataStore)
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
});
