import * as XLSX from "xlsx";

export interface ExcelSheetDefinition {
    name: string;
    rows: Array<Record<string, unknown>>;
}

function sanitizeSheetName(name: string): string {
    const cleaned = name
        .replace(/\//g, " ")
        .replace(/\\/g, " ")
        .replace(/[?*:]/g, " ")
        .replace(/\[/g, " ")
        .replace(/\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return cleaned.slice(0, 31) || "Sheet1";
}

function normalizeCellValue(value: unknown): string | number | boolean {
    if (value === null || value === undefined) {
        return "-";
    }

    if (value instanceof Date) {
        return value.toLocaleString("pt-BR");
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }

    return String(value);
}

function extractHeaders(rows: Array<Record<string, unknown>>): string[] {
    const headers = new Set<string>();

    rows.forEach((row) => {
        Object.keys(row).forEach((key) => headers.add(key));
    });

    return Array.from(headers);
}

function buildWorksheet(sheet: ExcelSheetDefinition): XLSX.WorkSheet {
    const title = sheet.name;
    const subtitle = `Exportação gerada em ${new Date().toLocaleString("pt-BR")}`;
    const sourceRows = sheet.rows.length > 0 ? sheet.rows : [{ "Sem dados": "Nenhum registro disponível" }];
    const headers = extractHeaders(sourceRows);
    const dataRows = sourceRows.map((row) => headers.map((header) => normalizeCellValue(row[header])));

    const worksheet = XLSX.utils.aoa_to_sheet([
        [title],
        [subtitle],
        [],
        headers,
        ...dataRows,
    ]);

    const columnCount = Math.max(headers.length, 1);
    const lastDataRowIndex = 3 + dataRows.length;

    worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
    ];

    worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
            s: { r: 3, c: 0 },
            e: { r: lastDataRowIndex, c: columnCount - 1 },
        }),
    };

    worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 4,
        topLeftCell: "A5",
        activePane: "bottomLeft",
        state: "frozen",
    };

    worksheet["!cols"] = headers.map((header, index) => {
        const headerWidth = header.length;
        const dataWidth = dataRows.reduce((max, row) => Math.max(max, String(row[index] ?? "").length), 0);

        return { wch: Math.min(Math.max(headerWidth, dataWidth, 12) + 2, 40) };
    });

    return worksheet;
}

export function downloadExcelFile(fileName: string, sheets: ExcelSheetDefinition[]): void {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet, index) => {
        const safeName = sanitizeSheetName(sheet.name) || `Sheet${index + 1}`;
        const worksheet = buildWorksheet(sheet);

        XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
    });

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}
