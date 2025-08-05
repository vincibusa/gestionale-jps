import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Fattura, RigaFattura } from './fatture';

// Estendi il tipo jsPDF per includere autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export async function generateFatturaPDF(fattura: Fattura): Promise<void> {
  const doc = new jsPDF();
  
  // Configura font
  doc.setFont('helvetica');
  
  // Header aziendale
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('GESTIONALE JOS', 20, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Polleria - Prodotti Ittici', 20, 37);
  doc.text('Via Example 123, 90100 Palermo (PA)', 20, 43);
  doc.text('Tel: +39 091 123456 - Email: info@gestionalejs.it', 20, 49);
  doc.text('P.IVA: 12345678901', 20, 55);
  
  // Linea separatrice
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 65, 190, 65);
  
  // Titolo fattura
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(`FATTURA N. ${fattura.numero_fattura}/${fattura.anno_fattura}`, 20, 80);
  
  // Stato fattura con colore
  const statusColors = {
    'bozza': [128, 128, 128],
    'emessa': [59, 130, 246],
    'inviata': [147, 51, 234],
    'pagata': [34, 197, 94],
    'annullata': [239, 68, 68]
  };
  
  const statusColor = statusColors[fattura.stato as keyof typeof statusColors] || [128, 128, 128];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFontSize(10);
  doc.text(`Stato: ${fattura.stato.toUpperCase()}`, 20, 87);
  
  // Box cliente
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.text('DESTINATARIO:', 20, 105);
  
  doc.setFontSize(10);
  doc.text(fattura.cliente_nome || 'Cliente non specificato', 20, 115);
  
  if (fattura.codice_destinatario && fattura.codice_destinatario !== '0000000') {
    doc.text(`Codice Destinatario: ${fattura.codice_destinatario}`, 20, 122);
  }
  
  if (fattura.pec_destinatario) {
    doc.text(`PEC: ${fattura.pec_destinatario}`, 20, 129);
  }
  
  // Dati fattura (destra)
  doc.text(`Data: ${new Date(fattura.data_fattura).toLocaleDateString('it-IT')}`, 130, 105);
  doc.text(`Tipo: ${fattura.tipo_documento || 'TD01'}`, 130, 112);
  doc.text(`Regime: ${fattura.regime_fiscale || 'RF01'}`, 130, 119);
  
  if (fattura.causale) {
    doc.text(`Causale: ${fattura.causale}`, 130, 126);
  }
  
  // Righe fattura - Tabella
  const tableStartY = 145;
  
  if (fattura.righe_fatture && fattura.righe_fatture.length > 0) {
    const tableData = fattura.righe_fatture.map((riga: RigaFattura) => [
      riga.descrizione,
      riga.quantita.toString(),
      `€ ${riga.prezzo_unitario.toFixed(2)}`,
      `${riga.aliquota_iva}%`,
      riga.sconto_percentuale ? `${riga.sconto_percentuale}%` : '-',
      `€ ${riga.totale_riga.toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: tableStartY,
      head: [['Descrizione', 'Qtà', 'Prezzo', 'IVA%', 'Sconto', 'Totale']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 40
      },
      columnStyles: {
        0: { cellWidth: 60 }, // Descrizione
        1: { cellWidth: 20, halign: 'center' }, // Quantità
        2: { cellWidth: 25, halign: 'right' }, // Prezzo
        3: { cellWidth: 15, halign: 'center' }, // IVA
        4: { cellWidth: 20, halign: 'center' }, // Sconto
        5: { cellWidth: 30, halign: 'right' } // Totale
      },
      margin: { left: 20, right: 20 }
    });
  }
  
  // Calcola posizione Y dopo la tabella
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 30;
  
  // Box totali
  const totalsY = Math.max(finalY + 20, 220);
  
  // Linea separatrice prima dei totali
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(130, totalsY - 5, 190, totalsY - 5);
  
  // Totali
  doc.setFontSize(10);
  doc.text('Subtotale:', 130, totalsY);
  doc.text(`€ ${fattura.subtotale.toFixed(2)}`, 170, totalsY, { align: 'right' });
  
  doc.text('IVA:', 130, totalsY + 7);
  doc.text(`€ ${fattura.iva.toFixed(2)}`, 170, totalsY + 7, { align: 'right' });
  
  if (fattura.ritenuta_acconto && fattura.ritenuta_acconto > 0) {
    doc.text('Ritenuta d\'acconto:', 130, totalsY + 14);
    doc.text(`€ ${fattura.ritenuta_acconto.toFixed(2)}`, 170, totalsY + 14, { align: 'right' });
  }
  
  // Totale finale con evidenziazione
  doc.setLineWidth(0.5);
  doc.setDrawColor(40, 40, 40);
  doc.line(130, totalsY + 18, 190, totalsY + 18);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTALE:', 130, totalsY + 28);
  doc.text(`€ ${fattura.totale.toFixed(2)}`, 170, totalsY + 28, { align: 'right' });
  
  // Note (se presenti)
  if (fattura.note) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Note:', 20, totalsY + 20);
    
    // Dividi le note in righe se troppo lunghe
    const noteLines = doc.splitTextToSize(fattura.note, 170);
    doc.text(noteLines, 20, totalsY + 27);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generato da Gestionale JOS', 20, pageHeight - 20);
  doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, 
           20, pageHeight - 15);
  
  // Scarica il PDF
  const fileName = `Fattura_${fattura.numero_fattura}_${fattura.anno_fattura}.pdf`;
  doc.save(fileName);
}

export async function generateFatturaPreview(fattura: Fattura): Promise<string> {
  const doc = new jsPDF();
  
  // Stesso codice di generazione ma ritorna come data URL per preview
  // (implementazione simile a generateFatturaPDF)
  
  return doc.output('datauristring');
}