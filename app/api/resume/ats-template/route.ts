import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  ATS_TEMPLATE_DOCX_FILENAME,
  ATS_TEMPLATE_PDF_FILENAME,
} from "@/lib/resume/resumeSpec";
import {
  getAtsTemplateDocxPath,
  getAtsTemplatePdfPath,
} from "@/lib/resume/resumeFixtures.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "pdf";

  try {
    if (format === "docx") {
      const buffer = await readFile(getAtsTemplateDocxPath());
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${ATS_TEMPLATE_DOCX_FILENAME}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const buffer = await readFile(getAtsTemplatePdfPath());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ATS_TEMPLATE_PDF_FILENAME}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ATS template file not found at project root." },
      { status: 404 },
    );
  }
}
