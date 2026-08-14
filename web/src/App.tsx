import { useEffect, useMemo, useState } from "react";
import initialItems from "../data/items.json";
import { getItemImage } from "./helpers/itemImages";
import { Item } from "./models/Item";

const normalizeUnit = (unit: string): string => {
  const normalized = unit.toLowerCase().trim();
  const map: Record<string, string> = {
    lốc: "lốc",
    lon: "lon",
    chai: "chai",
    gói: "gói",
    cái: "cái",
    miếng: "miếng",
    bịch: "bịch",
    thùng: "thùng",
    dây: "dây",
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
    strip:
      item.strip !== undefined &&
      item.strip !== null &&
      !isNaN(Number(item.strip))
        ? Number(item.strip)
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
    /^\s*(giá|lốc|dây)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:đ|vnd|vnđ|d|k|k?c?)(?:\s*\/\s*(chai|lon|lốc|bịch|gói|thùng|cái|dây))?/i;
  const inlinePriceRegex =
    /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:đ|vnd|vnđ|d|k|k?c?)\s*\/\s*(chai|lon|lốc|bịch|gói|thùng|cái|dây)/i;

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
      strip:
        typeof currentItem.strip === "number" ? currentItem.strip : undefined,
      image: currentItem.image,
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
      } else if (label === "dây") {
        currentItem.strip = amount;
        currentItem.unit = currentItem.unit || "dây";
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
  const [items, setItems] = useState<Item[]>(() => {
    const normalizedItems = (initialItems as any[]).map(normalizeItem);
    console.log("✅ Loaded items from JSON:", normalizedItems.length);
    return normalizedItems;
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [expandedMobileRows, setExpandedMobileRows] = useState<
    Record<number, boolean>
  >({});

  const getItemsPerPage = () =>
    typeof window !== "undefined" && window.innerWidth <= 640 ? 1 : 4;

  const [itemsPerPage, setItemsPerPage] = useState<number>(getItemsPerPage);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const visibleItems = items.slice(
    safeCurrentPage * itemsPerPage,
    safeCurrentPage * itemsPerPage + itemsPerPage,
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  useEffect(() => {
    setExpandedMobileRows({});
  }, [searchTerm]);

  const handleParse = () => {
    const parsed = parseReceipt(receiptText);
    if (parsed.length === 0) {
      setStatus("Không tìm thấy mặt hàng hợp lệ");
      return;
    }

    setItems((prev: Item[]) => [...parsed, ...prev]);
    setStatus(
      `✅ Đã thêm ${parsed.length} mặt hàng mới (chỉ hiển thị tạm thời)`,
    );
    setReceiptText("");
  };

  const openImagePopup = (imageUrl: string | undefined, itemName: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setSelectedItemName(itemName);
    } else {
      alert(`Không có ảnh cho sản phẩm "${itemName}"`);
    }
  };

  const closeImagePopup = () => {
    setSelectedImage(null);
    setSelectedItemName("");
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

        <div className="product-carousel">
          <button
            type="button"
            className="arrow-button prev"
            aria-label="Trang trước"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
            disabled={safeCurrentPage === 0}
          >
            ‹
          </button>

          <div className="item-grid">
            {visibleItems.map((item, index) => {
              const imageUrl = getItemImage(item);
              return (
                <article
                  key={`${item.name}-${safeCurrentPage}-${index}`}
                  className="item-card"
                >
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
                      {item.strip && (
                        <span>
                          Dây: {item.strip.toLocaleString("vi-VN")} đ/dây
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            className="arrow-button next"
            aria-label="Trang tiếp theo"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
            }
            disabled={safeCurrentPage >= totalPages - 1}
          >
            ›
          </button>
        </div>
      </section>

      <section className="search-bar card">
        <div className="status-bar" style={{ width: "100%" }}>
          <div>
            <h2>Tìm mặt hàng</h2>
          </div>
        </div>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm mặt hàng..."
        />
        <span>{filteredItems.length} kết quả</span>
      </section>

      <section className="results card">
        <div className="status-bar">
          <div>
            <h2>Kết quả</h2>
            <p>{status || "Xem chi tiết giá và mặt hàng."}</p>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="empty-state">Không tìm thấy mặt hàng phù hợp.</p>
        ) : (
          <>
            <div className="mobile-results-list">
              {filteredItems.map((item, index) => {
                const imageUrl = getItemImage(item);
                const isExpanded = !!expandedMobileRows[index];

                return (
                  <details
                    key={`${item.name}-${index}`}
                    className={"mobile-accordion " + (isExpanded ? "open" : "")}
                    open={isExpanded}
                    onToggle={(event) => {
                      const target = event.currentTarget;
                      setExpandedMobileRows((prev) => ({
                        ...prev,
                        [index]: target.open,
                      }));
                    }}
                  >
                    <summary className="mobile-summary">
                      <div className="mobile-summary-main">
                        <span
                          className="mobile-result-dot"
                          aria-hidden="true"
                        />
                        <span className="mobile-result-name">{item.name}</span>
                      </div>

                      <div className="mobile-summary-side">
                        <span className="mobile-result-price">
                          {item.price.toLocaleString("vi-VN")} đ/
                          {item.unit || "sp"}
                        </span>
                      </div>
                    </summary>

                    <div className="mobile-result-details">
                      <div className="mobile-detail-grid">
                        <div className="mobile-detail-box">
                          <span className="mobile-detail-label">Giá Lốc</span>
                          <span className="mobile-detail-value">
                            {item.pack
                              ? item.pack.toLocaleString("vi-VN") + " đ"
                              : "—"}
                          </span>
                        </div>
                        <div className="mobile-detail-box">
                          <span className="mobile-detail-label">Giá Thùng</span>
                          <span className="mobile-detail-value">
                            {item.box
                              ? item.box.toLocaleString("vi-VN") + " đ"
                              : "—"}
                          </span>
                        </div>
                        <div className="mobile-detail-box">
                          <span className="mobile-detail-label">Giá Dây</span>
                          <span className="mobile-detail-value">
                            {item.strip
                              ? item.strip.toLocaleString("vi-VN") + " đ"
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mobile-image-button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openImagePopup(imageUrl, item.name);
                        }}
                      >
                        <i className="fa-solid fa-camera" aria-hidden="true" />
                        Xem hình ảnh
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>

            <div className="table-wrap desktop-results-table">
              <table>
                <thead>
                  <tr>
                    <th>Mặt hàng</th>
                    <th>Đơn vị</th>
                    <th>Giá</th>
                    <th>Giá lốc</th>
                    <th>Giá thùng</th>
                    <th>Giá dây</th>
                    <th>Xem hình</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const imageUrl = getItemImage(item);
                    return (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.unit || "—"}</td>
                        <td>{item.price.toLocaleString("vi-VN")}</td>
                        <td>
                          {item.pack ? item.pack?.toLocaleString("vi-VN") : "—"}
                        </td>
                        <td>
                          {item.box ? item.box?.toLocaleString("vi-VN") : "—"}
                        </td>
                        <td>
                          {item.strip
                            ? item.strip?.toLocaleString("vi-VN")
                            : "—"}
                        </td>
                        <td>
                          <button
                            onClick={() => openImagePopup(imageUrl, item.name)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#007bff",
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: "4px 8px",
                              fontSize: "14px",
                            }}
                          >
                            📷 Xem hình
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Popup hiển thị ảnh */}
      {selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={closeImagePopup}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImagePopup}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#f44336",
                color: "white",
                fontSize: "20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                transition: "transform 0.2s",
                padding: "0",
                lineHeight: "1",
                overflow: "hidden",
                textAlign: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              ✕
            </button>

            <h3
              style={{
                margin: "0 0 16px 0",
                textAlign: "center",
                color: "#333",
                fontSize: "20px",
              }}
            >
              {selectedItemName}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: "80vw",
                maxHeight: "70vh",
              }}
            >
              <img
                src={selectedImage}
                alt={selectedItemName}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "16px",
                textAlign: "center",
                color: "#666",
                fontSize: "14px",
              }}
            >
              <p>Click bên ngoài ảnh hoặc nhấn ✕ để đóng</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer với bản quyền */}
      <footer
        style={{
          marginTop: "20px",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
          }}
        >
          <p style={{ marginBottom: 0 }}>
            © {new Date().getFullYear()} Tạp hóa Tuấn Đạt.
          </p>
          <p style={{ marginBottom: 0, marginTop: "5px" }}>Phát triển bởi</p>
          <b>Huỳnh Đức Thanh Tuấn & Nguyễn Gia Hiền</b>
        </div>
      </footer>
    </div>
  );
}
