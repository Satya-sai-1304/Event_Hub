import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoiceNumber: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  eventDate: string;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  status?: string;
  bookingDate?: string;
}

export const generateInvoice = (data: InvoiceData) => {
  const doc = new jsPDF();
  
  // Page setup
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  // Header with gradient-like effect using colors
  doc.setFillColor(167, 139, 250); // Primary purple
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, 25, { align: 'center' });
  
  // Company info (EventPro)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EventPro Platform', margin, 15);
  doc.text('contact@eventpro.com', margin, 20);
  
  // Invoice details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${data.invoiceNumber}`, pageWidth - margin - 60, 50);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 60, 57);
  
  // Bill To section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customerName, margin, 63);
  doc.text(data.customerEmail, margin, 70);
  
  // Event Details section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details:', margin, 85);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Event: ${data.eventTitle}`, margin + 5, 93);
  doc.text(`Date: ${new Date(data.eventDate).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })}`, margin + 5, 100);
  if (data.bookingDate) {
    doc.text(`Booking Date: ${new Date(data.bookingDate).toLocaleDateString('en-IN')}`, margin + 5, 107);
  }
  if (data.status) {
    doc.text(`Status: ${data.status.toUpperCase()}`, margin + 5, 114);
  }
  
  // Payment Summary Table
  const tableColumn = ['Description', 'Amount (₹)'];
  const tableRows = [
    ['Total Price', data.totalPrice.toLocaleString('en-IN')],
    ['Amount Paid', data.paidAmount.toLocaleString('en-IN')],
    ['Remaining Balance', data.remainingAmount.toLocaleString('en-IN')],
  ];
  
  autoTable(doc, {
    startY: 125,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [167, 139, 250] }, // Primary color
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: margin, right: margin },
  });
  
  // Final summary after table
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Payment summary box
  doc.setDrawColor(167, 139, 250);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, finalY - 5, pageWidth - (margin * 2), 30, 3, 3);
  
  // Total display
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Net Payable: ₹${data.remainingAmount.toLocaleString('en-IN')}`, margin + 10, finalY + 10);
  
  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for choosing EventPro!', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });
  doc.text('For any queries, please contact support@eventpro.com', pageWidth / 2, doc.internal.pageSize.height - 13, { align: 'center' });
  
  // Save the PDF
  const fileName = `Invoice_${data.invoiceNumber}_${data.eventTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.pdf`;
  doc.save(fileName);
};

export default generateInvoice;
