import type { LucideProps } from "lucide-react";

function DocumentDownloadFrame({ children, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      {children}
      <path d="M12 15v4" />
      <path d="m9.5 17 2.5 2.5 2.5-2.5" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function PdfDownloadIcon(props: LucideProps) {
  return (
    <DocumentDownloadFrame {...props}>
      <text
        x="12"
        y="10.5"
        textAnchor="middle"
        fontSize="4.25"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        PDF
      </text>
    </DocumentDownloadFrame>
  );
}

export function WordDownloadIcon(props: LucideProps) {
  return (
    <DocumentDownloadFrame {...props}>
      <path d="M8 7.5h6" strokeWidth="1.75" />
      <path d="M8 9.75h7" strokeWidth="1.75" />
      <path d="M8 12h5" strokeWidth="1.75" />
    </DocumentDownloadFrame>
  );
}
