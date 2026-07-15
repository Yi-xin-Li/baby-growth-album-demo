import { useState, type ImgHTMLAttributes } from "react";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackLabel?: string;
};

export function SafeImage({
  fallbackLabel = "成长照片",
  className = "",
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${fallbackLabel}暂未加载`}
        className={`flex items-center justify-center bg-[linear-gradient(145deg,#f9e7dc,#eef3d8)] text-xs text-neutral-500 ${className}`}
      >
        <span className="px-3 text-center">照片加载中…</span>
      </div>
    );
  }

  return <img {...props} className={className} onError={() => setFailed(true)} />;
}
