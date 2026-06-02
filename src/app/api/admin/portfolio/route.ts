import { NextResponse } from "next/server";
import { getPortfolioMetadata, savePortfolioMetadata } from "@/lib/storage";
import { revalidatePath } from "next/cache";

// Retrieve metadata for administration dashboard
export async function GET() {
  try {
    const metadata = await getPortfolioMetadata();
    return NextResponse.json({ success: true, metadata });
  } catch (err) {
    console.error("Failed to fetch portfolio metadata:", err);
    return NextResponse.json({ error: "Failed to load metadata" }, { status: 500 });
  }
}

// Update the portfolio metadata and trigger revalidation
export async function POST(request: Request) {
  try {
    const metadata = await request.json();
    
    // Validate schema
    if (!Array.isArray(metadata.categories) || !Array.isArray(metadata.images)) {
      return NextResponse.json({ error: "Invalid portfolio metadata payload" }, { status: 400 });
    }

    // Save configuration file
    await savePortfolioMetadata(metadata);
    
    // Revalidate public portfolio path
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update portfolio metadata:", err);
    return NextResponse.json({ error: "Failed to save metadata" }, { status: 500 });
  }
}
