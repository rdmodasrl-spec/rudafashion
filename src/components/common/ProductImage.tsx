import React, { useState } from 'react';

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  contain?: boolean;
};

const FALLBACK_IMAGE = '/pwa-512x512.png';

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  imageClassName = '',
  priority = false,
  contain = false
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageSource = failed || !src ? FALLBACK_IMAGE : src;

  return (
    <div className={`relative overflow-hidden bg-[#f4f1ed] ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f7f4f0] via-[#ebe7e1] to-[#f7f4f0]" aria-hidden="true" />
      )}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/10 via-transparent to-white/10 opacity-60" aria-hidden="true" />
      <img
        src={imageSource}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={`relative z-0 h-full w-full transition duration-700 ease-out ${
          contain ? 'object-contain p-2 sm:p-3' : 'object-cover object-center'
        } ${loaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
      />
    </div>
  );
};
