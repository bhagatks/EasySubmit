import { Compass } from "lucide-react";

interface NavigatorTipProps {
  message: string;
  className?: string;
}

export default function NavigatorTip({ message, className = "" }: NavigatorTipProps) {
  return (
    <div
      className={`flex gap-3 rounded-[12px] border border-[#12B3D1]/15 bg-[#12B3D1]/5 px-4 py-3 ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12B3D1]/15">
        <Compass size={18} strokeWidth={2} className="text-[#12B3D1]" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-[#1F2937]">Your Career Navigator</p>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{message}</p>
      </div>
    </div>
  );
}
