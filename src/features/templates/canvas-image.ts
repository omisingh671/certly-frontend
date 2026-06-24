type CanvasImageHandlers = {
  onLoad: (image: HTMLImageElement) => void;
  onError: () => void;
};

export const loadCanvasImage = (
  src: string,
  { onLoad, onError }: CanvasImageHandlers,
): HTMLImageElement => {
  const image = new window.Image();
  image.onload = () => onLoad(image);
  image.onerror = onError;
  image.src = src;

  return image;
};
