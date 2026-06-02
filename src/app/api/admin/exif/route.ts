import { NextResponse } from "next/server";
import parser from "exif-parser";

export async function POST(request: Request) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = parser.create(buffer).parse();
    const tags = result.tags || {};

    // Camera model and make
    let camera = "N/A";
    if (tags.Make || tags.Model) {
      const make = tags.Make ? tags.Make.trim() : "";
      const model = tags.Model ? tags.Model.trim() : "";
      
      // Clean up common duplicate naming (e.g. OLYMPUS CORPORATION E-M1MarkII -> Olympus E-M1MarkII)
      if (model.toLowerCase().startsWith(make.toLowerCase())) {
        camera = model;
      } else {
        camera = `${make} ${model}`.trim();
      }
      
      // Shorten common camera vendor names for presentation
      camera = camera
        .replace(/OLYMPUS CORPORATION/i, "Olympus")
        .replace(/NIKON CORPORATION/i, "Nikon")
        .replace(/CANON INC\./i, "Canon")
        .replace(/SONY CORPORATION/i, "Sony");
    }

    // Aperture formatting
    const aperture = tags.FNumber ? `f/${tags.FNumber}` : "N/A";

    // Shutter speed formatting (calculating fraction)
    let shutterSpeed = "N/A";
    if (tags.ExposureTime) {
      const expTime = tags.ExposureTime;
      if (expTime >= 1) {
        shutterSpeed = `${expTime}s`;
      } else {
        shutterSpeed = `1/${Math.round(1 / expTime)}s`;
      }
    }

    const iso = tags.ISO || undefined;
    const focalLength = tags.FocalLength ? `${tags.FocalLength}mm` : "N/A";
    const dateTaken = tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : undefined;

    return NextResponse.json({
      success: true,
      exif: {
        camera,
        aperture,
        shutterSpeed,
        iso,
        focalLength,
        dateTaken
      }
    });
  } catch (err) {
    console.error("EXIF parsing API error:", err);
    // Return empty N/A state so it doesn't crash the upload queue
    return NextResponse.json({
      success: false,
      exif: {
        camera: "N/A",
        aperture: "N/A",
        shutterSpeed: "N/A",
        iso: undefined,
        focalLength: "N/A",
        dateTaken: undefined
      }
    });
  }
}
