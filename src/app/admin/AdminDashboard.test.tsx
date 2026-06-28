// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";
import { PortfolioMetadata } from "@/lib/storage";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      refresh: vi.fn(),
    };
  },
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />;
  },
}));

// Mock exifr
vi.mock("exifr", () => ({
  default: {
    parse: vi.fn(),
  },
}));

describe("AdminDashboard Deferred Save Tests", () => {
  let mockMetadata: PortfolioMetadata;
  let mockFetch: any;

  beforeEach(() => {
    mockMetadata = {
      folders: [
        { slug: "travel", name: "Travel", description: "Around the world" }
      ],
      categories: [
        { slug: "city", name: "Cityscapes", description: "Urban views", folderSlug: "travel" }
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

    mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
    global.fetch = mockFetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("should not call savePortfolio immediately when title is edited, and warning banner should appear", async () => {
    render(<AdminDashboard initialMetadata={mockMetadata} />);

    // Get the title input field by display value
    const titleInput = screen.getByDisplayValue("Berlin") as HTMLInputElement;
    expect(titleInput).toBeDefined();

    // Simulate user editing the title field
    fireEvent.change(titleInput, { target: { value: "Berlin New" } });

    // The input value should change locally
    expect(titleInput.value).toBe("Berlin New");

    // Fetch should NOT have been called (no immediate S3/API save)
    expect(mockFetch).not.toHaveBeenCalled();

    // The warning banner should be visible in the DOM
    const bannerText = screen.getByText(
      /You have unsaved changes to your image details/i
    );
    expect(bannerText).toBeDefined();
  });

  it("should revert title changes and hide banner when Revert button is clicked", async () => {
    render(<AdminDashboard initialMetadata={mockMetadata} />);

    const titleInput = screen.getByDisplayValue("Berlin") as HTMLInputElement;

    // Simulate change
    fireEvent.change(titleInput, { target: { value: "Berlin New" } });
    expect(titleInput.value).toBe("Berlin New");

    const revertButton = screen.getByRole("button", { name: /Revert Changes/i });
    expect(revertButton).toBeDefined();

    // Click Revert
    fireEvent.click(revertButton);

    // Title input should restore back to "Berlin"
    expect(titleInput.value).toBe("Berlin");

    // The warning banner should be gone
    expect(screen.queryByText(/You have unsaved changes to your image details/i)).toBeNull();

    // Fetch should still NOT have been called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should save changes and hide banner when Apply button is clicked", async () => {
    render(<AdminDashboard initialMetadata={mockMetadata} />);

    const titleInput = screen.getByDisplayValue("Berlin") as HTMLInputElement;

    // Simulate change
    fireEvent.change(titleInput, { target: { value: "Berlin Final" } });

    const applyButton = screen.getByRole("button", { name: /Apply Changes/i });
    expect(applyButton).toBeDefined();

    // Click Apply
    fireEvent.click(applyButton);

    // Fetch should be called to save
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchArgs = mockFetch.mock.calls[0];
    expect(fetchArgs[0]).toBe("/api/admin/portfolio");
    expect(fetchArgs[1].method).toBe("POST");
    
    // The payload should contain the updated title
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.images[0].title).toBe("Berlin Final");
  });

  it("should edit a folder and cascade slug update to nested categories", async () => {
    render(<AdminDashboard initialMetadata={mockMetadata} />);

    // Switch to Manage Albums tab
    const manageAlbumsTab = screen.getByRole("button", { name: /Manage Albums/i });
    fireEvent.click(manageAlbumsTab);

    // Click the Edit Folder button for Travel
    const editFolderButton = screen.getByTitle("Edit Folder");
    fireEvent.click(editFolderButton);

    // Update the folder fields
    const nameInput = document.getElementById("edit-folder-name") as HTMLInputElement;
    const slugInput = document.getElementById("edit-folder-slug") as HTMLInputElement;
    const descInput = document.getElementById("edit-folder-desc") as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "Travel New" } });
    fireEvent.change(slugInput, { target: { value: "travel-new" } });
    fireEvent.change(descInput, { target: { value: "Around the world new" } });

    // Click Save
    const saveButton = screen.getByRole("button", { name: /Save/i });
    fireEvent.click(saveButton);

    // Fetch should be called to save with the cascading changes
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchArgs = mockFetch.mock.calls[0];
    expect(fetchArgs[0]).toBe("/api/admin/portfolio");
    expect(fetchArgs[1].method).toBe("POST");

    const payload = JSON.parse(fetchArgs[1].body);
    // Verify folder details are updated
    expect(payload.folders[0]).toEqual({
      slug: "travel-new",
      name: "Travel New",
      description: "Around the world new"
    });
    // Verify nested category's folderSlug is updated to travel-new
    expect(payload.categories[0].folderSlug).toBe("travel-new");
  });

  it("should edit an album and cascade slug update to containing photos", async () => {
    render(<AdminDashboard initialMetadata={mockMetadata} />);

    // Switch to Manage Albums tab
    const manageAlbumsTab = screen.getByRole("button", { name: /Manage Albums/i });
    fireEvent.click(manageAlbumsTab);

    // Click the Edit Album button for Cityscapes
    const editAlbumButton = screen.getByTitle("Edit Album");
    fireEvent.click(editAlbumButton);

    // Update the album fields
    const nameInput = document.getElementById("edit-album-name") as HTMLInputElement;
    const slugInput = document.getElementById("edit-album-slug") as HTMLInputElement;
    const descInput = document.getElementById("edit-album-desc") as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "Cityscapes New" } });
    fireEvent.change(slugInput, { target: { value: "city-new" } });
    fireEvent.change(descInput, { target: { value: "Urban views new" } });

    // Click Save
    const saveButton = screen.getByRole("button", { name: /Save/i });
    fireEvent.click(saveButton);

    // Fetch should be called to save with the cascading changes
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchArgs = mockFetch.mock.calls[0];
    expect(fetchArgs[0]).toBe("/api/admin/portfolio");
    expect(fetchArgs[1].method).toBe("POST");

    const payload = JSON.parse(fetchArgs[1].body);
    // Verify category details are updated
    expect(payload.categories[0]).toEqual({
      slug: "city-new",
      name: "Cityscapes New",
      description: "Urban views new",
      folderSlug: "travel"
    });
    // Verify photo category is updated to city-new
    expect(payload.images[0].category).toBe("city-new");
  });
});
