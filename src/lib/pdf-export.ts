import jsPDF from 'jspdf';
import { formatDateInItalian, getMonthDateRange } from './date-utils';
import { getStatisticheMensiliConPOSReali } from './services/cassa';

export interface DailyDetail {
  date: string;
  contanti: number;
  carta: number;
  altre: number;
  uscite: number;
  totale: number;
  chiuso: boolean;
  differenza?: number;
  note?: string;
}

export async function generateMonthlyReport(year: number, month: number): Promise<void> {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    
    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    const monthName = new Date(year, month - 1).toLocaleDateString('it-IT', { 
      month: 'long', 
      year: 'numeric' 
    });
    const title = `Resoconto Mensile - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    pdf.text(title, pageWidth / 2, 30, { align: 'center' });
    
    // Generate date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    const generateDate = `Generato il ${formatDateInItalian(new Date())} alle ${new Date().toLocaleTimeString('it-IT')}`;
    pdf.text(generateDate, pageWidth / 2, 40, { align: 'center' });
    
    let yPosition = 60;
    
    // Get monthly statistics with real POS data
    const stats = await getStatisticheMensiliConPOSReali(year, month);
    
    // Monthly Summary
    pdf.setFontSize(16);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Riepilogo Mensile', margin, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(12);
    const summaryData = [
      [`Giorni aperti:`, `${stats.giorni_aperti}`],
      [`Totale incassi:`, `€ ${stats.totale_incassi.toFixed(2)}`],
      [`Vendite contanti:`, `€ ${stats.totale_vendite_contanti.toFixed(2)}`],
      [`Vendite carta (POS):`, `€ ${stats.totale_vendite_carta.toFixed(2)}`],
      [`Altre entrate:`, `€ ${stats.totale_altre_entrate.toFixed(2)}`],
      [`Totale uscite:`, `€ ${stats.totale_uscite.toFixed(2)}`],
      [`Media giornaliera:`, `€ ${stats.media_giornaliera.toFixed(2)}`],
      [`Differenze totali:`, `€ ${stats.differenze_totali.toFixed(2)}`]
    ];
    
    summaryData.forEach(([label, value]) => {
      pdf.text(label, margin, yPosition);
      pdf.text(value, margin + 80, yPosition);
      yPosition += 8;
    });
    
    yPosition += 15;
    
    // Daily Details
    pdf.setFontSize(16);
    pdf.text('Dettaglio Giornaliero', margin, yPosition);
    yPosition += 10;
    
    // Use daily details from stats (already includes real POS data)
    const dailyDetails: DailyDetail[] = stats.dettaglio_giornaliero.map(d => ({
      date: d.data,
      contanti: d.vendite_contanti,
      carta: d.vendite_carta,
      altre: d.altre_entrate,
      uscite: d.uscite,
      totale: d.vendite_contanti + d.vendite_carta + d.altre_entrate,
      chiuso: d.chiuso,
      differenza: d.differenza,
      note: d.note
    }));
    
    // Table header
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    const headers = ['Data', 'Contanti', 'Carta', 'Altre', 'Uscite', 'Totale', 'Stato'];
    const colWidths = [30, 25, 25, 25, 25, 25, 25];
    let xPos = margin;
    
    headers.forEach((header, i) => {
      pdf.text(header, xPos, yPosition);
      xPos += colWidths[i];
    });
    
    yPosition += 2;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    // Table rows
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    
    for (const detail of dailyDetails) {
      if (yPosition > pdf.internal.pageSize.height - 30) {
        pdf.addPage();
        yPosition = 30;
      }
      
      xPos = margin;
      const rowData = [
        formatDateInItalian(detail.date),
        `€${detail.contanti.toFixed(2)}`,
        `€${detail.carta.toFixed(2)}`,
        `€${detail.altre.toFixed(2)}`,
        `€${detail.uscite.toFixed(2)}`,
        `€${detail.totale.toFixed(2)}`,
        detail.chiuso ? 'Chiusa' : 'Aperta'
      ];
      
      rowData.forEach((data, i) => {
        if (i === 0) {
          pdf.text(data, xPos, yPosition);
        } else {
          pdf.text(data, xPos + colWidths[i] - pdf.getTextWidth(data), yPosition);
        }
        xPos += colWidths[i];
      });
      
      yPosition += 7;
      
      // Add difference and notes if present
      if (detail.differenza && detail.differenza !== 0) {
        pdf.setFontSize(8);
        pdf.setTextColor(detail.differenza > 0 ? 0 : 180, detail.differenza > 0 ? 120 : 0, 0);
        const diffText = `Diff: €${detail.differenza > 0 ? '+' : ''}${detail.differenza.toFixed(2)}`;
        pdf.text(diffText, margin + 40, yPosition);
        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(9);
        yPosition += 6;
      }
      
      if (detail.note) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        const noteText = `Note: ${detail.note}`;
        const splitNote = pdf.splitTextToSize(noteText, pageWidth - margin * 2 - 40);
        pdf.text(splitNote, margin + 40, yPosition);
        yPosition += splitNote.length * 4 + 2;
        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(9);
      }
      
      yPosition += 3;
    }
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Pagina ${i} di ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
      pdf.text('Generato da Gestionale JOS', pageWidth - margin, pdf.internal.pageSize.height - 10, { align: 'right' });
    }
    
    // Save the PDF
    const filename = `resoconto-${year}-${month.toString().padStart(2, '0')}.pdf`;
    pdf.save(filename);
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}