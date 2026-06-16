interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function FormSection({ children, className = "" }: FormSectionProps) {
  return (
    <div className={`flex min-h-screen flex-col pt-12 ${className}`}>
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="w-full max-w-[500px]">{children}</div>
      </div>
    </div>
  );
}
