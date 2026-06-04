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
      folders: [],
      categories: [
        { slug: "city", name: "Cityscapes", description: "Urban views" }
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
});
