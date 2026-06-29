import { redirect } from "next/navigation";

const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/ask-gemini/daeaddalijienfjkhigbifmbdckbohjg";

export function GET() {
  redirect(EXTENSION_URL);
}
