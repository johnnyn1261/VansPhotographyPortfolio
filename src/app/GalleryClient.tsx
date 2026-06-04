"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Info, Maximize2, Minimize2 } from "lucide-react";
import { PortfolioMetadata } from "@/lib/storage";

interface GalleryClientProps {
  metadata: PortfolioMetadata;
  activeCategory: string;
}

export default function GalleryClient({ metadata, activeCategory }: GalleryClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLightboxImageLoading, setIsLightboxImageLoading] = useState(true);

  const [prevActiveCategory, setPrevActiveCategory] = useState(activeCategory);
  if (activeCategory !== prevActiveCategory) {
    setPrevActiveCategory(activeCategory);
    setSelectedImageIndex(null);
  }

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setShowMetadataPanel(false);
    setTimeout(() => {
      setSelectedImageIndex(null);
      setIsClosing(false);
    }, 300);
  }, []);

  const sortedImages = [...metadata.images].sort((a, b) => a.order - b.order);

  const filteredImages = activeCategory === "all"
    ? sortedImages.filter(img => img.favorite === true)
    : sortedImages.filter(img => img.category === activeCategory);

  useEffect(() => {
    if (selectedImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMaximized) {
          setIsMaximized(false);
        } else {
          handleClose();
        }
      } else if (e.key === "ArrowRight" && !isMaximized) {
        setSelectedImageIndex((prev) => (prev !== null && prev < filteredImages.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowLeft" && !isMaximized) {
        setSelectedImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredImages.length - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, filteredImages, handleClose, isMaximized]);

  const activePhoto = selectedImageIndex !== null ? filteredImages[selectedImageIndex] : null;

  useEffect(() => {
    if (activePhoto?.id) {
      setIsLightboxImageLoading(true);
    }
  }, [activePhoto?.id]);

  useEffect(() => {
    if (!showMetadataPanel) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const panel = document.getElementById("metadata-panel");
      const infoBtn = document.getElementById("info-btn");

      if (
        panel &&
        !panel.contains(event.target as Node) &&
        infoBtn &&
        !infoBtn.contains(event.target as Node)
      ) {
        setShowMetadataPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMetadataPanel]);

  const hasCameraSettings = activePhoto ? !!(
    (activePhoto.camera && activePhoto.camera !== "N/A") || 
    (activePhoto.aperture && activePhoto.aperture !== "N/A") || 
    (activePhoto.shutterSpeed && activePhoto.shutterSpeed !== "N/A") || 
    activePhoto.iso || 
    (activePhoto.focalLength && activePhoto.focalLength !== "N/A")
  ) : false;

  return (
    <div className="w-full flex flex-col gap-10">
      <div key={activeCategory} className="w-full animate-slide-up">
        {filteredImages.length === 0 ? (
          <div className="text-center py-24 text-text-light font-medium text-sm">
            No photographs in this collection yet.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {filteredImages.map((image, index) => (
              <div
                 key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                className="break-inside-avoid mb-4 group cursor-pointer bg-bg-alt border border-line-light overflow-hidden transition-all duration-500 ease-out hover:shadow-lg relative block"
              >
                <div className="overflow-hidden bg-bg-alt relative aspect-auto">
                  <Image
                    src={image.url}
                    alt={image.title}
                    width={image.width || 800}
                    height={image.height || 600}
                    className="w-full h-auto object-cover transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 3}
                    placeholder={image.blurDataURL ? "blur" : undefined}
                    blurDataURL={image.blurDataURL}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImageIndex !== null && activePhoto && (
        <>
          {/* Blurred Backdrop layer under the modal */}
          <div
            onClick={handleClose}
            className={`fixed inset-0 z-40 bg-black/15 backdrop-blur-sm cursor-pointer ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
          />

          {/* Modal Container with Margins */}
          <div className={`fixed inset-8 md:inset-16 lg:inset-20 z-50 flex flex-col bg-white/75 dark:bg-black/75 backdrop-blur-md border border-line-light/50 shadow-2xl select-none overflow-hidden rounded-sm ${isClosing ? "animate-scale-down" : "animate-scale-up"}`}>
            {/* Header Top Bar inside the modal */}
            <div className="relative h-10 px-4 flex items-center justify-end z-10 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  id="info-btn"
                  onClick={() => setShowMetadataPanel(!showMetadataPanel)}
                  className={`p-1 rounded-full hover:bg-bg-alt/60 text-text-main cursor-pointer transition-colors ${showMetadataPanel ? "bg-bg-alt" : ""}`}
                  title="Toggle details panel"
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={() => setIsMaximized(true)}
                  className="p-1 rounded-full hover:bg-bg-alt/60 text-text-main transition-colors cursor-pointer"
                  title="View full screen"
                >
                  <Maximize2 size={18} />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-full hover:bg-bg-alt/60 text-text-main transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Area with Image and Navigation */}
            <div className="flex-grow w-full min-h-0 relative flex items-center justify-center p-6 md:p-8 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredImages.length - 1));
                }}
                className="absolute left-6 z-10 p-3 rounded-full bg-white/80 dark:bg-bg-alt/80 border border-line-light text-text-main hover:bg-bg-base shadow-sm transition-all hover:scale-105 duration-200 cursor-pointer"
                title="Previous image"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="w-full h-full flex items-center justify-center relative">
                <Image
                  key={activePhoto.id}
                  src={activePhoto.url}
                  alt={activePhoto.title}
                  width={activePhoto.width || 1200}
                  height={activePhoto.height || 900}
                  className="max-w-full max-h-full w-auto h-auto object-contain block shadow-xl border border-line-light bg-bg-base animate-slide-up"
                  priority
                  unoptimized
                  placeholder={activePhoto.blurDataURL ? "blur" : undefined}
                  blurDataURL={activePhoto.blurDataURL}
                  onLoad={() => setIsLightboxImageLoading(false)}
                />
              </div>

              {showMetadataPanel && (
                <div
                  id="metadata-panel"
                  className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-80 md:w-96 max-w-[calc(100%-3rem)] flex flex-col justify-between border border-line-light/50 p-6 bg-white/80 dark:bg-black/80 backdrop-blur-md animate-fade-in shadow-xl h-fit max-h-[40vh] md:max-h-[50vh] overflow-y-auto z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-line-light pb-4 mb-4">
                      <span className="text-[10px] tracking-widest font-bold text-text-light uppercase">
                        {metadata.categories.find(c => c.slug === activePhoto.category)?.name || activePhoto.category}
                      </span>
                      <span className="text-[10px] font-semibold text-text-light">
                        {activePhoto.dateTaken
                          ? new Date(activePhoto.dateTaken).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : "N/A"}
                      </span>
                    </div>
                    <h2 className="font-serif text-xl italic font-semibold mb-3 tracking-wide">
                      {activePhoto.title}
                    </h2>
                    {activePhoto.description && (
                      <p className="text-xs text-text-muted leading-relaxed font-medium">
                        {activePhoto.description}
                      </p>
                    )}
                  </div>
                  
                  {hasCameraSettings && (
                    <div className="border-t border-line-light pt-4 mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[10px] font-medium text-text-muted">
                      {activePhoto.camera && activePhoto.camera !== "N/A" && (
                        <div className="col-span-2 sm:col-span-3 flex flex-col gap-0.5">
                          <span className="text-[8px] font-bold text-text-light uppercase tracking-wider">CAMERA</span>
                          <span className="text-text-main font-semibold">{activePhoto.camera}</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-bold text-text-light uppercase tracking-wider">APERTURE</span>
                        <span className="text-text-main font-semibold">{activePhoto.aperture || "N/A"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-bold text-text-light uppercase tracking-wider">SHUTTER</span>
                        <span className="text-text-main font-semibold">{activePhoto.shutterSpeed || "N/A"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-bold text-text-light uppercase tracking-wider">ISO</span>
                        <span className="text-text-main font-semibold">{activePhoto.iso || "N/A"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                        <span className="text-[8px] font-bold text-text-light uppercase tracking-wider">FOCAL LENGTH</span>
                        <span className="text-text-main font-semibold">{activePhoto.focalLength || "N/A"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) => (prev !== null && prev < filteredImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-6 z-10 p-3 rounded-full bg-white/80 dark:bg-bg-alt/80 border border-line-light text-text-main hover:bg-bg-base shadow-sm transition-all hover:scale-105 duration-200 cursor-pointer"
                title="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Full Screen maximized image overlay view */}
      {selectedImageIndex !== null && activePhoto && isMaximized && (
        <div 
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setIsMaximized(false)}
        >
          <Image
            src={activePhoto.url}
            alt={activePhoto.title}
            width={activePhoto.width || 1920}
            height={activePhoto.height || 1080}
            className="max-w-full max-h-full w-auto h-auto object-contain block shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            priority
            unoptimized
          />
          <button
            onClick={() => setIsMaximized(false)}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/80 dark:bg-bg-alt/80 border border-line-light text-text-main hover:bg-bg-base shadow-lg transition-all hover:scale-105 duration-200 cursor-pointer"
            title="Exit full screen"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
