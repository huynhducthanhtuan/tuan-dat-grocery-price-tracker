import { Item } from "../models/Item";

export const parseAmount = (text: string): number =>
  parseFloat(text.replace(/\./g, "").replace(",", "."));

export const formatItemName = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const normalizeItem = (item: any): Item => {
  const price =
    typeof item.price === "number" ? item.price : parseAmount(String(item.price || "0"));

  return {
    name: formatItemName(String(item.name || "")),
    price,
    unit: String(item.unit || ""),
    pack:
      item.pack !== undefined && item.pack !== null && !isNaN(Number(item.pack))
        ? Number(item.pack)
        : undefined,
    box:
      item.box !== undefined && item.box !== null && !isNaN(Number(item.box))
        ? Number(item.box)
        : undefined,
    strip:
      item.strip !== undefined && item.strip !== null && !isNaN(Number(item.strip))
        ? Number(item.strip)
        : undefined,
    ten:
      item.ten !== undefined && item.ten !== null && !isNaN(Number(item.ten))
        ? Number(item.ten)
        : undefined,
    image: item.image ? String(item.image) : undefined,
  };
};
