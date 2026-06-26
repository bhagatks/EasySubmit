import Image from "next/image";
import { getInitials } from "@/lib/dashboard/user-display";
import { getAvatarGradient } from "@/lib/profile/avatar-gradient";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: 40,
  md: 64,
  lg: 96,
} as const;

export type UserAvatarProps = {
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  name?: string | null;
  /** Stable key for gradient selection (user id or email). */
  seed?: string | null;
  size?: keyof typeof SIZE_MAP | number;
  className?: string;
};

export function UserAvatar({
  image,
  firstName,
  lastName,
  email,
  name,
  seed,
  size = "md",
  className,
}: UserAvatarProps) {
  const px = typeof size === "number" ? size : SIZE_MAP[size];
  const initials = getInitials(firstName, lastName, email, name);
  const gradient = getAvatarGradient(seed ?? email ?? name ?? initials);
  const fontSize = Math.max(11, Math.round(px * 0.34));

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-white/20 shadow-[0_4px_14px_rgba(18,179,209,0.18)]",
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden={!image}
    >
      {image ? (
        image.startsWith("blob:") ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Image
            key={image}
            src={image}
            alt=""
            fill
            className="object-cover"
            sizes={`${px}px`}
            unoptimized={image.startsWith("/avatars/")}
          />
        )
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-display font-semibold text-white"
          style={{
            fontSize,
            background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
          }}
        >
          <span className="drop-shadow-sm">{initials}</span>
        </div>
      )}
    </div>
  );
}
