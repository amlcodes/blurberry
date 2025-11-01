import { Globe } from "lucide-react";
import React from "react";

interface FaviconProps {
  src?: string | null;
  size?: number;
}

export const Favicon: React.FC<FaviconProps> = ({ src, size = 16 }) => {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return <Globe className="text-muted-foreground" size={size} />;
  }

  return (
    <img
      src={src}
      alt="favicon"
      className="size-full"
      onError={() => setHasError(true)}
    />
  );
};
