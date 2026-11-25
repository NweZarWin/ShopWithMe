export function getImageUrl(imagePath) {
  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
}
