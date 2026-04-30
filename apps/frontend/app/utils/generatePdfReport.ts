import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AssetSummary {
  assetId: string;
  type: "CEDEAR" | "ACCION_LOCAL";
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  yieldPercentage: number;
}

interface PortfolioSummaryResponse {
  assets: AssetSummary[];
  totalPortfolioValueARS: number;
  totalPortfolioValueUSD: number | null;
  exchangeRateUsed: number | null;
}

const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`;
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const generatePortfolioPDF = (summaryData: PortfolioSummaryResponse): void => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let currentY = margin;

  // Add title
  doc.setFontSize(24);
  doc.setFont("Helvetica", "bold");
  doc.text("Reporte de Portfolio", margin, currentY);
  currentY += 12;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Equilibrio", margin, currentY);
  currentY += 10;

  // Add date and timestamp
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  const now = new Date();
  const formattedDate = now.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("es-AR");
  doc.text(`Generado: ${formattedDate} ${formattedTime}`, margin, currentY);
  currentY += 8;

  // Add summary values
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.text("Resumen de Valores", margin, currentY);
  currentY += 7;

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  const summaryBoxHeight = 25;
  const summaryBox1 = margin;
  const summaryBox2 = margin + contentWidth / 2;

  // Box 1: Total Value ARS
  doc.setDrawColor(200);
  doc.rect(summaryBox1, currentY - 2, contentWidth / 2 - 2, summaryBoxHeight);
  doc.text("Total Valor (ARS)", summaryBox1 + 3, currentY + 3);
  doc.setFontSize(14);
  doc.setFont("Helvetica", "bold");
  doc.text(formatCurrency(summaryData.totalPortfolioValueARS), summaryBox1 + 3, currentY + 12);

  // Box 2: Total Value USD
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.rect(summaryBox2 + 2, currentY - 2, contentWidth / 2 - 4, summaryBoxHeight);
  doc.text("Total Valor (USD)", summaryBox2 + 5, currentY + 3);
  doc.setFontSize(14);
  doc.setFont("Helvetica", "bold");
  const usdValue =
    summaryData.totalPortfolioValueUSD !== null
      ? formatCurrency(summaryData.totalPortfolioValueUSD)
      : "N/A";
  doc.text(usdValue, summaryBox2 + 5, currentY + 12);

  currentY += summaryBoxHeight + 5;

  // Add exchange rate if available
  if (summaryData.exchangeRateUsed !== null) {
    doc.setFontSize(9);
    doc.setFont("Helvetica", "italic");
    doc.text(
      `Tipo de cambio MEP utilizado: ${formatCurrency(summaryData.exchangeRateUsed)}`,
      margin,
      currentY,
    );
    currentY += 5;
  }

  currentY += 5;

  // Add assets table
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.text("Posiciones", margin, currentY);
  currentY += 8;

  const tableData = summaryData.assets.map((asset) => [
    asset.assetId,
    asset.totalQuantity.toFixed(2),
    formatCurrency(asset.averagePrice),
    formatCurrency(asset.currentPrice),
    formatCurrency(asset.currentValue),
    formatPercentage(asset.yieldPercentage),
  ]);

  autoTable(doc, {
    head: [["Ticker", "Cantidad", "Precio Prom.", "Precio Actual", "Valor Actual (ARS)", "Rendimiento (%)"]],
    body: tableData,
    startY: currentY,
    margin: margin,
    theme: "grid",
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8,
      halign: "right",
    },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    didDrawPage(data) {
      // Add footer
      const pageCount = doc.internal.pages.length - 1;
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setFont("Helvetica", "italic");
      doc.setTextColor(150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        footerY,
        { align: "center" },
      );
    },
  });

  // Save the PDF
  doc.save("equilibrio-reporte.pdf");
};
