export type ItemImageLookup = {
  name?: string;
  image?: string;
};

export const fallbackImages: Record<string, string> = {
  "không độ": "khong_do.jpg",
  "bò húc": "bo_huc.jpg",
  nutri: "nutri.jpg",
  "trà ô long": "c2.jpg",
};

export const getItemImage = (item: ItemImageLookup): string => {
  const filename = item.image || fallbackImages[item.name?.toLowerCase() ?? ""];
  return filename
    ? new URL(`../images/items/${filename}`, import.meta.url).href
    : "";
};
