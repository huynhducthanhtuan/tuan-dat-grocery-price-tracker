import { useEffect, useMemo, useState } from "react";
import initialItems from "../data/items.json";
import { getItemImage, fallbackImages } from "./helpers/itemImages";

export type Item = {
  name: string;
  price: number;
  unit: string;
  pack?: number;
  box?: number;
  image?: string;
};

const normalizeUnit = (unit: string): string => {
  const normalized = unit.toLowerCase().trim();
  const map: Record<string, string> = {
    lốc: "lốc",
    lọ: "lon",
    lon: "lon",
    chai: "chai",
    gói: "gói",
    cái: "cái",
    miếng: "miếng",
    bịch: "bịch",
    thùng: "thùng",
    c: "cái",
  };

  return map[normalized] || normalized;
};

const parseAmount = (text: string): number =>
  parseFloat(text.replace(/\./g, "").replace(",", "."));

const normalizeItem = (item: any): Item => {
  const price =
    typeof item.price === "number"
      ? item.price
      : parseAmount(String(item.price || "0"));

  return {
    name: String(item.name || ""),
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
    image: item.image ? String(item.image) : undefined,
  };
};

const parseReceipt = (text: string): Item[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: Item[] = [];
  const priceLineRegex =
    /^\s*(giá|lốc)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:đ|vnd|vnđ|d|k|k?c?)(?:\s*\/\s*(chai|lon|lọ|lốc|bịch|gói|thùng|cái|c))?/i;
  const inlinePriceRegex =
    /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:đ|vnd|vnđ|d|k|k?c?)\s*\/\s*(chai|lon|lọ|lốc|bịch|gói|thùng|cái|c)/i;

  let currentItem: Partial<Item> = { unit: "" };

  const finalizeItem = () => {
    if (!currentItem.name) return;
    const price = typeof currentItem.price === "number" ? currentItem.price : 0;

    items.push({
      name: String(currentItem.name),
      price,
      unit: String(currentItem.unit || ""),
      pack: typeof currentItem.pack === "number" ? currentItem.pack : undefined,
      box: typeof currentItem.box === "number" ? currentItem.box : undefined,
      image:
        typeof currentItem.image === "string"
          ? currentItem.image
          : fallbackImages[String(currentItem.name || "").toLowerCase()] ||
            undefined,
    });
    currentItem = { unit: "" };
  };

  for (const line of lines) {
    const priceLineMatch = line.match(priceLineRegex);
    if (priceLineMatch) {
      const label = priceLineMatch[1].toLowerCase();
      const amount = parseAmount(priceLineMatch[2]);
      const unit = priceLineMatch[3]
        ? normalizeUnit(priceLineMatch[3])
        : currentItem.unit || "";
      if (label === "lốc") {
        currentItem.pack = amount;
        currentItem.unit = currentItem.unit || "lốc";
      } else {
        currentItem.price = amount;
        currentItem.unit = unit || currentItem.unit || "chai";
      }
      continue;
    }

    const inlineMatch = line.match(inlinePriceRegex);
    if (inlineMatch) {
      currentItem.price = parseAmount(inlineMatch[1]);
      currentItem.unit = normalizeUnit(inlineMatch[2]);
      continue;
    }

    if (currentItem.name) {
      finalizeItem();
    }
    currentItem.name = line;
    currentItem.unit = "";
  }

  finalizeItem();
  return items;
};

export default function App() {
  const [receiptText, setReceiptText] = useState<string>("");
  // LUÔN LUÔN sử dụng dữ liệu từ file JSON, không lưu vào localStorage
  const [items, setItems] = useState<Item[]>(() => {
    // Normalize dữ liệu từ initialItems
    const normalizedItems = (initialItems as any[]).map(normalizeItem);
    console.log("✅ Loaded items from JSON:", normalizedItems.length);
    console.log("📦 Sample item:", normalizedItems[0]);
    return normalizedItems;
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  const handleParse = () => {
    const parsed = parseReceipt(receiptText);
    if (parsed.length === 0) {
      setStatus("Không tìm thấy mặt hàng hợp lệ");
      return;
    }

    // Chỉ thêm vào state để hiển thị, KHÔNG lưu vào localStorage
    setItems((prev: Item[]) => [...parsed, ...prev]);
    setStatus(
      `✅ Đã thêm ${parsed.length} mặt hàng mới (chỉ hiển thị tạm thời)`,
    );
    setReceiptText("");
  };

  // Hàm reset về dữ liệu gốc từ file JSON
  const resetToOriginal = () => {
    const normalizedItems = (initialItems as any[]).map(normalizeItem);
    setItems(normalizedItems);
    setStatus("🔄 Đã reset về dữ liệu gốc từ file JSON");
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <span className="eyebrow">Tạp hóa Tuấn Đạt</span>
          <h1>Trích xuất giá sản phẩm</h1>
          <p>
            Theo dõi giá hàng tạp hoá của Tuấn Đạt. Trích xuất giá và quản lý
            danh sách mặt hàng.
          </p>
        </div>
      </header>

      <section className="item-list card">
        <div className="section-head">
          <div>
            <h2>Danh sách mặt hàng</h2>
            <p>Hiển thị các mặt hàng có trong cửa hàng</p>
          </div>
          <span className="item-count">{items.length} mặt hàng</span>
        </div>

        <div className="item-grid">
          {items.map((item, index) => {
            const imageUrl = getItemImage(item);
            return (
              <article key={index} className="item-card">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="item-card-image"
                  />
                ) : null}
                <div className="item-card-content">
                  <div className="item-card-title">{item.name}</div>
                  <div className="item-card-meta">
                    <span>Đơn vị: {item.unit || "sp"}</span>
                    <span>
                      Giá: {item.price.toLocaleString("vi-VN")} đ/
                      {item.unit || "sp"}
                    </span>
                    {item.pack && (
                      <span>
                        Lốc: {item.pack.toLocaleString("vi-VN")} đ/lốc
                      </span>
                    )}
                    {item.box && (
                      <span>
                        Thùng: {item.box.toLocaleString("vi-VN")} đ/thùng
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="results card">
        <div className="status-bar">
          <div>
            <h2>Kết quả</h2>
            <p>{status || "Xem chi tiết giá và mặt hàng."}</p>
          </div>
          <div className="pill">{filteredItems.length} mục</div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="empty-state">Không tìm thấy mặt hàng phù hợp.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mặt hàng</th>
                  <th>Đơn vị</th>
                  <th>Giá</th>
                  <th>Giá lốc</th>
                  <th>Giá thùng</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.unit || "—"}</td>
                    <td>
                      {item.price.toLocaleString("vi-VN")} đ/{item.unit || "sp"}
                    </td>
                    <td>{item.pack?.toLocaleString("vi-VN") || "—"}</td>
                    <td>{item.box?.toLocaleString("vi-VN") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
