import { escapeHtml } from "@/lib/job-tracker/export/html-escape";

export function buildWordHtmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.5; color: #1f2937; }
    pre { white-space: pre-wrap; font-family: Georgia, serif; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export function buildWordBlobFromHtml(title: string, bodyHtml: string): Uint8Array {
  const html = buildWordHtmlDocument(title, bodyHtml);
  return new TextEncoder().encode(html);
}

export function buildWordBlobFromPlainText(title: string, text: string): Uint8Array {
  const body = `<pre>${escapeHtml(text)}</pre>`;
  return buildWordBlobFromHtml(title, body);
}
