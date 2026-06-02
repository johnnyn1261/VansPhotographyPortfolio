import { NextResponse } from "next/server";
import { getUploadUrl, deleteFile } from "@/lib/storage";
import fs from "fs";
import path from "path";

// Initialize upload (Get S3 Presigned URL or local mock endpoint)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, fileType } = body;

    if (!filename || !fileType) {
      return NextResponse.json({ error: "filename and fileType are required" }, { status: 400 });
    }

    const uploadInfo = await getUploadUrl(filename, fileType);
    return NextResponse.json(uploadInfo);
  } catch (err) {
    console.error("Upload API init error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}

// Receive upload (Only used in 'local' mock mode)
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename parameter is required" }, { status: 400 });
    }

    if (process.env.STORAGE_MODE === "aws") {
      return NextResponse.json({ error: "Direct uploads to server not allowed in AWS mode" }, { status: 400 });
    }

    // Read the binary stream from client
    const fileBuffer = await request.arrayBuffer();
    
    // Save to public/mock/uploads/
    const mockDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "mock", "uploads");
    
    // Ensure dir exists
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir, { recursive: true });
    }

    const filePath = path.join(mockDir, filename);
    await fs.promises.writeFile(filePath, Buffer.from(fileBuffer));

    return NextResponse.json({
      success: true,
      url: `/mock/uploads/${filename}`
    });
  } catch (err) {
    console.error("Local file upload write error:", err);
    return NextResponse.json({ error: "Failed to write file locally" }, { status: 500 });
  }
}

// Delete physical asset (S3 object or local mock uploads file)
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    await deleteFile(filename);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Physical file deletion error:", err);
    return NextResponse.json({ error: "Failed to delete file from storage" }, { status: 500 });
  }
}
