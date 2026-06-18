interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function FormSection({ children, className = "" }: FormSectionProps) {
  return (
    <div className={`flex min-h-full flex-col pt-12 ${className}`}>
      <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-10">
        <div className="flex w-full max-w-[500px] flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
