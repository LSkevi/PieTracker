export function parseReceiptText(text: string): { establishment: string; total: string } {
  let establishment = "Não encontrado";
  let total = "0,00";

  try {
    const totalRegex = /TOTAL(?: R\$)?\s*(\d+,\d{2})/i;
    const totalMatch = text.match(totalRegex);
    if (totalMatch && totalMatch[1]) {
      total = totalMatch[1];
    }

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && (trimmedLine.includes('LTDA') || trimmedLine.includes('MEI'))) {
        establishment = trimmedLine;
        break;
      }
    }
    if (establishment === "Não encontrado") {
        establishment = lines.find(line => line.trim() !== '') || "Não encontrado";
    }

  } catch (error) {
    console.error("Erro durante o parsing do texto:", error);
  }

  return { establishment, total };
}