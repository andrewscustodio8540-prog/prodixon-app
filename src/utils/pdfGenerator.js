import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReportPDF = (reports, companyName = 'PRODIXON', filterDate = '', filterShift = '') => {
    if (!reports || reports.length === 0) {
        alert("Não há dados para gerar o relatório.");
        return;
    }

    const doc = new jsPDF();

    // Customizing colors (Primary Gold/Bronze matching logo: #e0a96d)
    const primaryColor = [224, 169, 109];
    const textColor = [50, 50, 50];

    // Add an image (Logo) if possible, using text as fallback for now

    // Header
    const safeCompanyName = String(companyName || 'PRODIXON');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(safeCompanyName, 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Relatório de Fechamento de Produção', 14, 30);

    let periodText = 'Período: Todos os Registros';
    if (filterDate && filterShift) {
        const [y, m, d] = filterDate.split('-');
        periodText = `Filtro: Data ${d}/${m}/${y} | Turno ${filterShift}`;
    } else if (filterDate) {
        const [y, m, d] = filterDate.split('-');
        periodText = `Filtro: Relatório Diário de ${d}/${m}/${y}`;
    } else if (filterShift) {
        periodText = `Filtro: Todos os dias | Turno ${filterShift}`;
    }

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(periodText, 14, 37);

    doc.setFontSize(10);
    doc.text(`Criado em: ${new Date().toLocaleString('pt-BR')}`, 14, 43);

    // Table Data
    const tableColumn = ["Data / Turno", "Mák / Op / Peça", "Produção & Eficiência", "Refugos & Qualidade", "Paradas & Ocorrências"];
    const tableRows = [];

    reports.forEach(report => {
        const scStr = Array.isArray(report.scraps) && report.scraps.length > 0
            ? report.scraps.map(s => `• ${s.quantity}un: ${s.reason}`).join('\n')
            : '';

        const dwStr = Array.isArray(report.downtimes) && report.downtimes.length > 0
            ? report.downtimes.map(d => `• ${d.minutes}m: ${d.reason}`).join('\n')
            : '0 min';

        let notasFormatadas = '';
        if (report.notes && report.notes.trim() !== '') {
            notasFormatadas = `\n\nObs:\n${report.notes}`;
        }

        const target = Number(report.target) || 0;
        const gross = Number(report.produced_gross) || 0;
        const net = Number(report.net) || 0;
        const refuse = Number(report.refuse) || 0;

        const percAtingido = target > 0 ? ((net / target) * 100).toFixed(1) : '0.0';
        const percRefugo = gross > 0 ? ((refuse / gross) * 100).toFixed(1) : '0.0';

        const producaoStr = `Meta: ${target.toLocaleString('pt-BR')} un\nBruta: ${gross.toLocaleString('pt-BR')} un\nLíquida: ${net.toLocaleString('pt-BR')} un\n\nEficiência: ${percAtingido}%\nÍndice OEE: ${report.oee}%`;

        const refugoStr = `Total: ${refuse.toLocaleString('pt-BR')} un (${percRefugo}%)\n\n${scStr}`;

        const reportData = [
            `${report.date}\nTurno: ${report.shift}`,
            `Cód: ${report.machine}\nOp: ${report.operator}\nPeça: ${report.part}`,
            producaoStr,
            refugoStr,
            `${dwStr}${notasFormatadas}`
        ];
        tableRows.push(reportData);
    });

    // Generate Table using the imported autoTable plugin
    autoTable(doc, {
        startY: 48,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: textColor
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248]
        }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Software PRODIXON SaaS`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    const fileName = `Relatorio_PRODIXON_${new Date().toLocaleDateString('en-CA').replace(/-/g, '')}.pdf`;
    doc.save(fileName);
};
