import type { ImgHTMLAttributes } from "react";

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizes: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-24 h-24 text-2xl",
};

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean);
  return (parts[0] ?? "") + (parts[1] ?? "");
}

export function Avatar({ src, name, size = "md", className = "", ...props }: AvatarProps) {
  const cls = `inline-flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold ${sizes[size]} ${className}`;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? "avatar"} className={cls} {...props} />;
  }
  return (
    <span className={cls} aria-label={name ?? "avatar"}>
      {initials(name).toUpperCase()}
    </span>
  );
}
