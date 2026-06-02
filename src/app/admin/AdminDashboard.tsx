"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  Upload, Trash2, LogOut, Image as ImageIcon, 
  Settings, FolderPlus, GripVertical, Check, AlertCircle 
} from "lucide-react";
import { PortfolioMetadata, Photo, Category } from "@/lib/storage";

interface AdminDashboardProps {
  initialMetadata: PortfolioMetadata;
}

interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  description: string;
  category: string;
  order: number;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;

  // EXIF fields
  camera?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  focalLength?: string;
  dateTaken?: string;
}

export default function AdminDashboard({ initialMetadata }: AdminDashboardProps) {
  const [metadata, setMetadata] = useState<PortfolioMetadata>(initialMetadata);
  const [activeTab, setActiveTab] = useState<"gallery" | "upload" | "albums">("gallery");
  const [galleryFilter, setGalleryFilter] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Drag and drop state
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Sync ref to avoid closure issues during async/event loops
  const metadataRef = useRef(metadata);
  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  const initialDragIndexRef = useRef<number | null>(null);

  // Upload queue state
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [uploadingAll, setUploadingAll] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const savePortfolio = async (updatedMetadata: PortfolioMetadata) => {
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedMetadata),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      
      setMetadata(updatedMetadata);
      showStatus("success", "Portfolio configurations updated successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update configurations";
      showStatus("error", message);
    }
  };



  // Add Category Handler
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    
    const slug = newCatSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    
    if (metadata.categories.some(c => c.slug === slug)) {
      showStatus("error", `Album slug "${slug}" already exists`);
      return;
    }

    const newCat: Category = {
      slug,
      name: newCatName,
      description: newCatDesc
    };

    const updated = {
      ...metadata,
      categories: [...metadata.categories, newCat]
    };

    setNewCatName("");
    setNewCatSlug("");
    setNewCatDesc("");
    savePortfolio(updated);
  };

  // Delete Category Handler
  const handleDeleteCategory = (slug: string) => {
    if (metadata.images.some(img => img.category === slug)) {
      alert("Cannot delete album because it still contains photos. Reassign or delete those photos first.");
      return;
    }

    if (!confirm("Are you sure you want to delete this album?")) return;

    const updated = {
      ...metadata,
      categories: metadata.categories.filter(c => c.slug !== slug)
    };
    savePortfolio(updated);
  };

  // Edit Single Photo Info in Gallery List
  const handlePhotoUpdate = (photoId: string, fields: Partial<Photo>) => {
    const updatedImages = metadata.images.map(img => 
      img.id === photoId ? { ...img, ...fields } : img
    );
    const updated = { ...metadata, images: updatedImages };
    savePortfolio(updated);
  };

  // Delete Photo Handler
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo from your portfolio?")) return;
    
    const photoToDelete = metadata.images.find(img => img.id === photoId);
    if (!photoToDelete) return;

    try {
      // 1. Delete physical file from S3 / Local storage
      const res = await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: photoToDelete.filename })
      });
      if (!res.ok) {
        console.warn("Failed to delete physical file from storage, proceeding with catalog cleanup.");
      }
    } catch (err) {
      console.error("Error deleting physical file:", err);
    }

    // 2. Remove photo object from metadata catalog and save
    const updatedImages = metadata.images.filter(img => img.id !== photoId);
    const updated = { ...metadata, images: updatedImages };
    await savePortfolio(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (activeCardId !== id) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);

    // Track starting position in active album list
    const idx = displayedPhotos.findIndex(img => img.id === id);
    initialDragIndexRef.current = idx;
    
    // Set draggedId in a timeout to ensure browser captures the drag image first
    setTimeout(() => {
      setDraggedId(id);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const sorted = [...metadata.images].sort((a, b) => a.order - b.order);
    const displayed = galleryFilter === "all"
      ? sorted
      : sorted.filter(img => img.category === galleryFilter);

    const fromIdx = displayed.findIndex(img => img.id === draggedId);
    const toIdx = displayed.findIndex(img => img.id === targetId);

    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    // Move the item in the displayed slice
    const newDisplayed = [...displayed];
    const [removed] = newDisplayed.splice(fromIdx, 1);
    newDisplayed.splice(toIdx, 0, removed);

    // Map the new displayed slice back to metadata.images
    let displayedIdx = 0;
    const finalImages = sorted.map(img => {
      if (galleryFilter === "all" || img.category === galleryFilter) {
        return newDisplayed[displayedIdx++];
      }
      return img;
    });

    // Re-assign sequential order integers
    finalImages.forEach((img, idx) => {
      img.order = idx;
    });

    setMetadata({
      ...metadata,
      images: finalImages
    });
  };

  const handleDragEnd = () => {
    if (draggedId !== null && initialDragIndexRef.current !== null) {
      const sorted = [...metadataRef.current.images].sort((a, b) => a.order - b.order);
      const displayed = galleryFilter === "all"
        ? sorted
        : sorted.filter(img => img.category === galleryFilter);

      const finalIdx = displayed.findIndex(img => img.id === draggedId);
      if (finalIdx !== -1 && finalIdx !== initialDragIndexRef.current) {
        savePortfolio(metadataRef.current);
      }
    }

    setDraggedId(null);
    setActiveCardId(null);
    initialDragIndexRef.current = null;
  };

  // Read dimensions of the image on the client
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Queue files selected from file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newItems: UploadQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawName = file.name.split(".")[0];
      const defaultTitle = rawName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());

      // Slice the first 128KB to parse EXIF on server
      let exifData = {};
      try {
        const slice = file.slice(0, 131072);
        const exifRes = await fetch("/api/admin/exif", {
          method: "POST",
          body: slice
        });
        if (exifRes.ok) {
          const resJson = await exifRes.json();
          if (resJson.success && resJson.exif) {
            exifData = resJson.exif;
          }
        }
      } catch (err) {
        console.error("Error fetching EXIF:", err);
      }

      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        title: defaultTitle,
        description: "",
        category: metadata.categories[0]?.slug || "landscapes",
        order: metadata.images.length + i,
        status: "queued",
        progress: 0,
        ...exifData
      });
    }

    setUploadQueue([...uploadQueue, ...newItems]);
    // Clear input
    e.target.value = "";
  };

  const handleQueueItemChange = (id: string, fields: Partial<UploadQueueItem>) => {
    setUploadQueue(uploadQueue.map(item => 
      item.id === id ? { ...item, ...fields } : item
    ));
  };

  const handleRemoveFromQueue = (id: string) => {
    setUploadQueue(uploadQueue.filter(item => item.id !== id));
  };

  // Master Upload Run
  const handleStartUpload = async () => {
    if (uploadQueue.length === 0 || uploadingAll) return;
    setUploadingAll(true);

    const uploadedPhotos: Photo[] = [];
    const queue = [...uploadQueue];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "done") continue;

      setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: "uploading", progress: 20 } : p));

      try {
        // 1. Get client-side image dimensions
        const { width, height } = await getImageDimensions(item.file);
        
        // 2. Fetch upload URLs from backend (unified mock/S3)
        const initRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.file.name,
            fileType: item.file.type
          })
        });

        if (!initRes.ok) throw new Error("Failed to initialize upload session");
        const { uploadUrl, key, publicUrl } = await initRes.json();

        // 3. Upload Binary Data direct to returned URL
        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, progress: 50 } : p));
        
        const uploadHeaders: Record<string, string> = {};
        // AWS presigned URLs require the content type matches the signature
        if (process.env.STORAGE_MODE === "aws" || uploadUrl.startsWith("http")) {
          uploadHeaders["Content-Type"] = item.file.type;
        }

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: item.file,
          headers: uploadHeaders
        });

        if (!putRes.ok) throw new Error("Upload transfer failed");

        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, progress: 90 } : p));

        // 4. Formulate the photo metadata
        const newPhoto: Photo = {
          id: Math.random().toString(36).substr(2, 9),
          filename: key,
          url: publicUrl,
          title: item.title,
          description: item.description,
          category: item.category,
          width,
          height,
          dateAdded: new Date().toISOString(),
          order: item.order,
          camera: item.camera,
          aperture: item.aperture,
          shutterSpeed: item.shutterSpeed,
          iso: item.iso,
          focalLength: item.focalLength,
          dateTaken: item.dateTaken
        };

        uploadedPhotos.push(newPhoto);
        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: "done", progress: 100 } : p));
      } catch (err) {
        console.error(`Error uploading ${item.file.name}:`, err);
        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: "error", progress: 0 } : p));
      }
    }

    if (uploadedPhotos.length > 0) {
      // Append new photos to S3/local array and save
      const updatedImages = [...metadata.images, ...uploadedPhotos];
      const updated = {
        ...metadata,
        images: updatedImages
      };
      await savePortfolio(updated);
      
      // Clear out successful items from queue
      setUploadQueue(prev => prev.filter(p => p.status !== "done"));
    }

    setUploadingAll(false);
    showStatus("success", `Uploaded ${uploadedPhotos.length} photos successfully!`);
  };

  const sortedPhotos = [...metadata.images].sort((a, b) => a.order - b.order);
  const displayedPhotos = galleryFilter === "all"
    ? sortedPhotos
    : sortedPhotos.filter(img => img.category === galleryFilter);

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-10 flex-grow flex flex-col gap-8 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-line-light pb-6">
        <div>
          <h1 className="font-serif text-2xl italic font-semibold leading-tight">
            Admin and Management
          </h1>
          <p className="text-xs text-text-light mt-1">Signed in as administrator</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase border border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-colors rounded-sm"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* Horizontal Tabs Bar at the Top */}
      <nav className="flex flex-wrap gap-2 border-b border-line-light -mt-8 pt-4 pb-4">
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors rounded-sm ${
            activeTab === "gallery"
              ? "bg-text-main text-bg-base"
              : "text-text-muted hover:text-text-main hover:bg-bg-alt"
          }`}
        >
          <ImageIcon size={14} />
          Photos ({metadata.images.length})
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors rounded-sm ${
            activeTab === "upload"
              ? "bg-text-main text-bg-base"
              : "text-text-muted hover:text-text-main hover:bg-bg-alt"
          }`}
        >
          <Upload size={14} />
          Upload Photos
        </button>
        <button
          onClick={() => setActiveTab("albums")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors rounded-sm ${
            activeTab === "albums"
              ? "bg-text-main text-bg-base"
              : "text-text-muted hover:text-text-main hover:bg-bg-alt"
          }`}
        >
          <Settings size={14} />
          Manage Albums
        </button>
      </nav>

      {/* Main Workspace Area */}
      <section className="flex-grow flex flex-col">
        {/* Status Toast Alert */}
        {statusMessage && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 p-4 text-xs font-semibold flex items-center gap-3 border shadow-2xl rounded-md animate-fade-in whitespace-nowrap ${
            statusMessage.type === "success" 
              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900/50" 
              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900/50"
          }`}>
            {statusMessage.type === "success" ? <Check size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: Gallery Image Management */}
        {activeTab === "gallery" && (
          <div className="flex flex-col gap-6">
            
            {/* Album Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-line-light pb-4 mb-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-light tracking-widest uppercase">FILTER BY ALBUM:</span>
                <select
                  value={galleryFilter}
                  onChange={(e) => setGalleryFilter(e.target.value)}
                  className="border border-line-medium px-3 py-1.5 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                >
                  <option value="all">All Albums ({metadata.images.length})</option>
                  {metadata.categories.map(c => {
                    const count = metadata.images.filter(img => img.category === c.slug).length;
                    return (
                      <option key={c.slug} value={c.slug}>{c.name} ({count})</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {displayedPhotos.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-line-medium bg-bg-alt text-text-light text-sm font-medium">
                No photographs in this album. Click &quot;Upload Photos&quot; to add some or change another photo&apos;s album.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {displayedPhotos.map((photo) => (
                  <div 
                    key={photo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, photo.id)}
                    onDragOver={(e) => handleDragOver(e, photo.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex flex-row border bg-white dark:bg-bg-alt transition-all duration-200 ${
                      photo.id === draggedId
                        ? "opacity-30 border-dashed border-text-muted scale-[0.99] shadow-none"
                        : photo.id === activeCardId
                        ? "shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] scale-[1.01] rotate-[0.5deg] border-line-dark relative z-10"
                        : "border-line-light shadow-sm"
                    }`}
                  >
                    {/* Full-height Left Drag Handle */}
                    <div 
                      className="drag-handle w-10 shrink-0 border-r border-line-light hover:border-line-medium bg-bg-base dark:bg-bg-alt/20 hover:bg-bg-alt dark:hover:bg-bg-alt/50 text-text-muted hover:text-text-main cursor-grab active:cursor-grabbing transition-colors duration-150 flex items-center justify-center"
                      title="Drag card to reorder"
                      onMouseDown={() => setActiveCardId(photo.id)}
                      onMouseUp={() => setActiveCardId(null)}
                      onMouseLeave={() => {
                        if (!draggedId) {
                          setActiveCardId(null);
                        }
                      }}
                    >
                      <GripVertical size={16} />
                    </div>

                    {/* Main Card Content */}
                    <div className="flex-grow flex flex-col p-5 gap-5">
                      {/* Top Row: Thumbnail + Title & Album */}
                      <div className="flex flex-col md:flex-row gap-5 items-start">
                        {/* Thumbnail */}
                        <div className="relative w-48 h-32 border border-line-light bg-bg-alt overflow-hidden shrink-0">
                          <Image
                            src={photo.url}
                            alt={photo.title}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        </div>

                        {/* Title and Album Collection Fields (Stacked) */}
                        <div className="flex-grow flex flex-col gap-3 w-full">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-text-light tracking-widest">TITLE</label>
                            <input
                              type="text"
                              value={photo.title}
                              onChange={(e) => handlePhotoUpdate(photo.id, { title: e.target.value })}
                              className="border border-line-medium px-3 py-1.5 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-text-light tracking-widest">ALBUM COLLECTION</label>
                            <select
                              value={photo.category}
                              onChange={(e) => handlePhotoUpdate(photo.id, { category: e.target.value })}
                              className="border border-line-medium px-3 py-1.5 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                            >
                              {metadata.categories.map(c => (
                                <option key={c.slug} value={c.slug}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Description and Action Sidebar */}
                      <div className="flex flex-col lg:flex-row gap-5 items-end">
                        {/* Description field - full width of the left side */}
                        <div className="flex-grow flex flex-col gap-2 w-full">
                          <label className="text-[10px] font-bold text-text-light tracking-widest">DESCRIPTION</label>
                          <textarea
                            value={photo.description || ""}
                            rows={2}
                            onChange={(e) => handlePhotoUpdate(photo.id, { description: e.target.value })}
                            className="border border-line-medium px-3 py-1.5 text-xs focus:outline-none focus:border-line-dark resize-y bg-bg-base text-text-main w-full"
                          />
                        </div>

                        {/* Action Buttons - aligned on the right on large screens */}
                        <div className="shrink-0 w-full lg:w-auto">
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="flex items-center justify-center gap-2 border border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-300 px-4 py-2 text-xs font-semibold transition-colors w-full lg:w-auto"
                            title="Delete photo"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Upload Queue Area */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-6">


            {/* Drop Zone Input */}
            <div className="border-2 border-dashed border-line-medium hover:border-line-dark bg-bg-alt flex flex-col items-center justify-center py-10 px-6 text-center transition-colors relative cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={32} className="text-text-light mb-3" />
              <p className="text-xs font-semibold text-text-muted tracking-wider">
                DRAG & DROP PHOTOGRAPHS HERE
              </p>
              <p className="text-[10px] text-text-light mt-1">
                Supports JPG, PNG, WebP up to 25MB
              </p>
            </div>

            {/* Queue List */}
            {uploadQueue.length > 0 && (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center justify-between border-b border-line-light pb-2">
                  <span className="text-xs font-bold text-text-muted">
                    QUEUE LIST ({uploadQueue.length} IMAGES)
                  </span>
                  <button
                    onClick={handleStartUpload}
                    disabled={uploadingAll}
                    className="flex items-center gap-2 bg-text-main text-bg-base px-4 py-2 text-xs font-semibold tracking-wider hover:opacity-95 transition-opacity disabled:opacity-50"
                  >
                    {uploadingAll ? "UPLOADING QUEUE..." : "START UPLOAD PROCESS"}
                  </button>
                </div>

                {uploadQueue.map((item) => (
                  <div 
                    key={item.id}
                    className="border border-line-light p-4 flex flex-col md:flex-row gap-5 bg-white dark:bg-bg-alt relative"
                  >
                    {/* Preview Thumbnail */}
                    <div className="w-28 h-20 relative border border-line-light overflow-hidden shrink-0 bg-bg-alt">
                      <Image
                        src={item.previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      
                      {/* Upload Progress Bar overlay */}
                      {item.status === "uploading" && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex flex-col items-center justify-center p-2">
                          <span className="text-[10px] font-bold text-text-main">
                            {item.progress}%
                          </span>
                          <div className="w-full h-1 bg-gray-200 dark:bg-neutral-800 mt-1 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-text-main transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meta Fields */}
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-text-light tracking-widest">TITLE</label>
                        <input
                          type="text"
                          value={item.title}
                          disabled={uploadingAll}
                          onChange={(e) => handleQueueItemChange(item.id, { title: e.target.value })}
                          className="border border-line-medium px-2 py-1 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-text-light tracking-widest">ALBUM</label>
                        <select
                          value={item.category}
                          disabled={uploadingAll}
                          onChange={(e) => handleQueueItemChange(item.id, { category: e.target.value })}
                          className="border border-line-medium px-2 py-1 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                        >
                          {metadata.categories.map(c => (
                            <option key={c.slug} value={c.slug}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-text-light tracking-widest">DESCRIPTION</label>
                        <input
                          type="text"
                          value={item.description}
                          disabled={uploadingAll}
                          placeholder="Optional details"
                          onChange={(e) => handleQueueItemChange(item.id, { description: e.target.value })}
                          className="border border-line-medium px-2 py-1 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                        />
                      </div>
                    </div>

                    {/* Delete from queue */}
                    <button
                      onClick={() => handleRemoveFromQueue(item.id)}
                      disabled={uploadingAll}
                      className="p-2 border border-line-medium hover:border-red-300 hover:text-red-600 dark:hover:border-red-900/50 dark:hover:text-red-400 disabled:opacity-30 shrink-0 self-center"
                      title="Remove from queue"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Albums & Profile Configurations */}
        {activeTab === "albums" && (
          <div className="flex flex-col gap-10">

            {/* Albums Collections Section */}
            <div>


              {/* Add Album Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <form onSubmit={handleAddCategory} className="border border-line-light p-6 bg-white dark:bg-bg-alt flex flex-col gap-4 lg:col-span-1">
                  <span className="text-[10px] font-bold text-text-light tracking-widest border-b border-line-light pb-2 mb-2 block">
                    CREATE NEW ALBUM
                  </span>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-text-muted tracking-widest">ALBUM NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. Travel & Wildlife"
                      value={newCatName}
                      onChange={(e) => {
                        setNewCatName(e.target.value);
                        if (!newCatSlug) {
                          setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                        }
                      }}
                      className="border border-line-medium px-2.5 py-1.5 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-text-muted tracking-widest">URL SLUG (ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. travel-wildlife"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                      className="border border-line-medium px-2.5 py-1.5 text-xs focus:outline-none focus:border-line-dark bg-bg-base text-text-main"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-text-muted tracking-widest">DESCRIPTION (OPTIONAL)</label>
                    <textarea
                      rows={2}
                      placeholder="Summary..."
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      className="border border-line-medium px-2.5 py-1.5 text-xs focus:outline-none focus:border-line-dark resize-y bg-bg-base text-text-main"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2 bg-text-main text-bg-base text-xs font-semibold tracking-widest hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                  >
                    <FolderPlus size={14} />
                    ADD NEW ALBUM
                  </button>
                </form>

                {/* Albums Grid List */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-text-light tracking-widest border-b border-line-light pb-2 mb-2 block">
                    EXISTING ALBUMS
                  </span>
                  
                  {metadata.categories.map((cat) => (
                    <div 
                      key={cat.slug}
                      className="border border-line-light p-4 bg-white dark:bg-bg-alt flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <h4 className="font-serif text-sm font-semibold tracking-wide italic">
                          {cat.name}
                        </h4>
                        <code className="text-[9px] text-text-light uppercase font-bold tracking-wider">
                          SLUG: {cat.slug}
                        </code>
                        {cat.description && (
                          <p className="text-[10px] text-text-muted mt-1 leading-relaxed max-w-md">
                            {cat.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteCategory(cat.slug)}
                        className="p-2 border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
                        title="Delete Album"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
