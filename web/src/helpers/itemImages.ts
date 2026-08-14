export type ItemImageLookup = {
  name?: string;
  image?: string;
};

export const getItemImage = (item: ItemImageLookup): string => {
  const filename = item.image;
  return filename ? new URL(`../images/items/${filename}`, import.meta.url).href : "";
};
