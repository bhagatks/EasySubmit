declare module "rake-js" {
  export default function rake(
    text: string,
    options?: { language?: string; delimiters?: string[] },
  ): string[];
}
