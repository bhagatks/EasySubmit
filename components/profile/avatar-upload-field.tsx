"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { removeProfileAvatar, uploadProfileAvatar } from "@/app/actions/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AvatarUploadFieldProps = {
  image: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  name?: string | null;
  seed?: string | null;
  onImageChange: (image: string | null) => void;
  variant?: "settings" | "onboarding";
  className?: string;
};

export function AvatarUploadField({
  image,
  firstName,
  lastName,
  email,
  name,
  seed,
  onImageChange,
  variant = "settings",
  className,
}: AvatarUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { update: updateSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnboarding = variant === "onboarding";

  async function handleFile(file: File | null) {
    if (!file) return;

    const previousImage = image;
    const previewUrl = URL.createObjectURL(file);
    onImageChange(previewUrl);

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const data = await uploadProfileAvatar(formData);
      if (!data.success) {
        throw new Error(data.error ?? "Could not upload photo.");
      }

      onImageChange(data.image);
      await updateSession({ image: data.image });
    } catch (uploadError) {
      onImageChange(previousImage);
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);

    try {
      const data = await removeProfileAvatar();
      if (!data.success) {
        throw new Error(data.error);
      }

      onImageChange(null);
      await updateSession({ image: null });
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar
            image={image}
            firstName={firstName}
            lastName={lastName}
            email={email}
            name={name}
            seed={seed}
            size={isOnboarding ? "lg" : "md"}
          />
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className={cn("text-sm font-medium", isOnboarding ? "text-[oklch(0.98_0.01_268)]" : "text-foreground")}>
            Profile photo
          </p>
          <p
            className={cn(
              "text-xs leading-relaxed",
              isOnboarding ? "text-[oklch(0.65_0.02_268)]" : "text-muted-foreground",
            )}
          >
            {isOnboarding
              ? "Optional — add a friendly face for your dashboard. You can change this anytime in Settings."
              : "Upload a square photo. We resize it for you."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isOnboarding ? "outline" : "secondary"}
              size="sm"
              className={cn("rounded-xl", isOnboarding && "border-white/15 bg-white/5 text-white hover:bg-white/10")}
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              {image ? "Change photo" : "Upload photo"}
            </Button>
            {image ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("rounded-xl", isOnboarding && "text-white/80 hover:bg-white/10 hover:text-white")}
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFile(file);
        }}
      />

      {error ? (
        <p className={cn("text-xs", isOnboarding ? "text-red-300" : "text-destructive")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
