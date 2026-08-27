import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace } from "@/lib/dal";
import { storeMedia } from "@/lib/media/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const workspaceSlug = String(form.get("workspace") ?? "");
  const file = form.get("file");

  if (!workspaceSlug || !(file instanceof File)) {
    return NextResponse.json(
      { error: "workspace and file are required" },
      { status: 400 },
    );
  }

  const ws = await requireWorkspace(workspaceSlug); // redirects if not a member

  try {
    const asset = await storeMedia({
      workspaceId: ws.id,
      userId: ws.user.id,
      file,
    });
    return NextResponse.json({ asset });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
