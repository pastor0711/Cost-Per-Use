/**
 * Exporter Logic - Handles data conversion and downloads.
 */
class Exporter {
    /** Shorthand for translation */
    static t(key) {
        return window.i18n.t(key);
    }

    static formatCurrency(amount) {
        const cur = I18n.currencies.find(c => c.code === window.i18n.currentCurrency) || I18n.currencies[0];
        return new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code }).format(amount);
    }

    static downloadFile(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    static toJSON(items) {
        return JSON.stringify(items, null, 2);
    }

    static toCSV(items) {
        if (items.length === 0) return "";

        const headers = [
            Exporter.t('csvName'),
            Exporter.t('csvCategory'),
            Exporter.t('csvBuyPrice'),
            Exporter.t('csvResaleValue'),
            Exporter.t('csvNetCost'),
            Exporter.t('csvUses'),
            Exporter.t('csvCPU'),
            Exporter.t('csvCreated')
        ];
        const rows = items.map(item => {
            const netCost = item.price - (item.resaleValue || 0);
            const costPerUse = item.useCount === 0 ? netCost : netCost / item.useCount;
            return [
                `"${item.name}"`,
                `"${item.category || ''}"`,
                item.price.toFixed(2),
                (item.resaleValue || 0).toFixed(2),
                netCost.toFixed(2),
                item.useCount,
                costPerUse.toFixed(2),
                new Date(item.dateCreated).toLocaleDateString()
            ].join(",");
        });

        return [headers.join(","), ...rows].join("\n");
    }

    static toMarkdown(items) {
        const t = Exporter.t.bind(Exporter);
        const fmt = Exporter.formatCurrency;

        if (items.length === 0) return `# ${t('reportTitle')}\n\n${t('reportNoItems')}`;

        let md = `# ${t('reportTitle')}\n\n`;
        md += `| ${t('reportHeaderName')} | ${t('reportHeaderCategory')} | ${t('reportHeaderNetCost')} | ${t('reportHeaderUses')} | ${t('reportHeaderCPU')} |\n`;
        md += "| :--- | :--- | :--- | :--- | :--- |\n";

        items.forEach(item => {
            const netCost = item.price - (item.resaleValue || 0);
            const costPerUse = item.useCount === 0 ? netCost : netCost / item.useCount;
            md += `| ${item.name} | ${item.category || '-'} | ${fmt(netCost)} | ${item.useCount} | **${fmt(costPerUse)}** |\n`;
        });

        const totalValue = items.reduce((sum, item) => sum + item.price, 0);
        const totalNet = items.reduce((sum, item) => sum + (item.price - (item.resaleValue || 0)), 0);

        md += `\n\n### ${t('reportSummary')}\n`;
        md += `* **${t('reportTotalItems')}**: ${items.length}\n`;
        md += `* **${t('reportTotalInvestment')}**: ${fmt(totalValue)}\n`;
        md += `* **${t('reportTotalNetValue')}**: ${fmt(totalNet)}\n`;
        md += `\n*${t('reportGenerated')} ${new Date().toLocaleDateString()}*`;

        return md;
    }
}

window.exporter = Exporter;
