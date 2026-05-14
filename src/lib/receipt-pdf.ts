export type ReceiptLine = {
  title: string;
  quantity: number;
  lineTotalUAH: number;
  lineTotalTokens: number;
  discountPercentApplied: number;
  sellerCompanyName?: string | null;
};

export type ReceiptOrder = {
  id: string;
  createdAt: Date;
  fulfillment: "pickup" | "delivery";
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPhone: string | null;
  totalUAH: number;
  totalTokens: number;
  buyer: { companyName: string; email: string; phone: string | null };
  lines: ReceiptLine[];
};

export function buildOrderReceiptPdfBuffer(order: ReceiptOrder): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require("pdfkit") as typeof import("pdfkit");

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 48 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).text("СпівДія — квитанція про покупку", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#444").text(`Номер: ${order.id}`, { align: "center" });
      doc.text(`Дата: ${order.createdAt.toLocaleString("uk-UA")}`, { align: "center" });
      doc.moveDown();

      doc.fillColor("#000").fontSize(11).text(`Покупець: ${order.buyer.companyName}`);
      doc.fontSize(9).fillColor("#555").text(order.buyer.email);
      if (order.buyer.phone) doc.text(order.buyer.phone);
      doc.moveDown(0.5);

      doc.fillColor("#000").fontSize(11).text(order.fulfillment === "delivery" ? "Доставка" : "Самовивіз");
      if (order.fulfillment === "delivery") {
        doc.fontSize(9).fillColor("#555");
        if (order.deliveryCity) doc.text(`Місто: ${order.deliveryCity}`);
        if (order.deliveryPhone) doc.text(`Телефон: ${order.deliveryPhone}`);
        if (order.deliveryAddress) doc.text(`Адреса: ${order.deliveryAddress}`);
      }
      doc.moveDown();

      doc.fillColor("#000").fontSize(12).text("Товари", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9);
      for (const line of order.lines) {
        const seller = line.sellerCompanyName ?? "Продавець";
        doc.fillColor("#000").text(`${line.title} × ${line.quantity}`);
        doc.fillColor("#555").text(`  Продавець: ${seller}`);
        doc
          .fillColor("#000")
          .text(
            `  ${line.lineTotalUAH.toLocaleString("uk-UA")} ₴  ·  ${line.lineTotalTokens} монет (знижка ${line.discountPercentApplied}%)`,
          );
        doc.moveDown(0.3);
      }

      doc.moveDown();
      doc.fontSize(12).text(`Разом: ${order.totalUAH.toLocaleString("uk-UA")} ₴`, { align: "right" });
      doc.text(`СпівМонети: ${order.totalTokens}`, { align: "right" });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
