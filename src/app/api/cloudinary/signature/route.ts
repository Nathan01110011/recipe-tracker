import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { basicAuthHeaders, isAuthorized } from "@/lib/basic-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorized(request.headers)) {
    return new Response(null, {
      status: 401,
      headers: basicAuthHeaders(),
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const timestamp = Math.round(Date.now() / 1000);
    const purpose = body.purpose === "source" ? "source" : "cooked";
    const defaultFolder =
      purpose === "source"
        ? process.env.CLOUDINARY_SOURCE_UPLOAD_FOLDER || "recipe-tracker/source"
        : process.env.CLOUDINARY_COOKED_UPLOAD_FOLDER ||
          process.env.CLOUDINARY_UPLOAD_FOLDER ||
          "recipe-tracker/cooked";
    const folder =
      typeof body.folder === "string" && body.folder.trim()
        ? body.folder.trim()
        : defaultFolder;
    const params = { folder, timestamp };

    return NextResponse.json({
      apiKey: requiredEnv("CLOUDINARY_API_KEY"),
      cloudName: requiredEnv("CLOUDINARY_CLOUD_NAME"),
      folder,
      purpose,
      signature: signCloudinaryParams(params),
      timestamp,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create upload signature.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function signCloudinaryParams(params: Record<string, string | number>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${requiredEnv("CLOUDINARY_API_SECRET")}`)
    .digest("hex");
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
