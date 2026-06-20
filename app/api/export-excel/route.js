// app/api/export-excel/route.js
import { NextResponse } from 'next/server';
import XlsxPopulate from 'xlsx-populate';
import path from 'path';
import fs from 'fs/promises'; // <-- Gagamitin natin ito para iwas cache

export async function POST(request) {
    try {
        const body = await request.json();
        const { paymentStats, productStats, filteredSales, monthName, year } = body;

        const templatePath = path.join(process.cwd(), 'public', 'sanivend-template.xlsx');
        
        // Pilitin basahin ang pinakabagong file at iwasan ang Next.js Cache
        const fileBuffer = await fs.readFile(templatePath);
        const workbook = await XlsxPopulate.fromDataAsync(fileBuffer);
        
        const worksheet = workbook.sheet("Dashboard");

        // --- 1. HEADER ---
        worksheet.cell("B3").value(`REPORTING PERIOD: ${monthName} ${year}`);

        // --- 2. PAYMENT & TOTALS BREAKDOWN ---
        const rfidValue = Number(paymentStats?.find(p => p.name === 'RFID')?.value || 0);
        const cashValue = Number(paymentStats?.find(p => p.name === 'Cash' || p.name === 'CASH')?.value || 0);
        
        worksheet.cell("B15").value(rfidValue);
        worksheet.cell("C15").value(cashValue);

        // Compute natin ang totoong Totals galing sa Database
        const totalTransactions = filteredSales ? filteredSales.length : 0;
        const totalRevenue = filteredSales ? filteredSales.reduce((sum, sale) => sum + Number(sale.amount), 0) : 0;

        // Ilagay ang Totals sa Column K (K14 at K15) - Naka-Peso Format
        worksheet.cell("K14").value(totalRevenue).style("numberFormat", "₱#,##0.00");
        worksheet.cell("K15").value(totalTransactions);

        // --- 3. PRODUCT BREAKDOWN ---
        const productColumns = [
            { col: 'E', title: 'PERSONAL HYGIENE WIPES', keyword: 'WIPE' },
            { col: 'F', title: 'HEAVY FLOW PADS', keyword: 'HEAVY' },
            { col: 'G', title: 'REGULAR PADS', keyword: 'REGULAR' },
            { col: 'H', title: 'PANTY LINERS', keyword: 'LINER' }
        ];
        
        productColumns.forEach(item => {
            const prodData = productStats?.find(p => 
                p.name && p.name.toUpperCase().includes(item.keyword)
            );
            
            const prodValue = Number(prodData ? prodData.value : 0);

            worksheet.cell(`${item.col}14`).value(item.title);  
            worksheet.cell(`${item.col}15`).value(prodValue); 
        });

        // --- 4. TRANSACTION TABLE ---
        let currentRow = 17; 
        if (filteredSales && filteredSales.length > 0) {
            filteredSales.forEach(sale => {
                currentRow++;
                
                worksheet.cell(`D${currentRow}`).value(new Date(sale.createdAt).toLocaleString()); 
                worksheet.cell(`E${currentRow}`).value(sale.slotId.replace('slot', 'Slot '));      
                worksheet.cell(`F${currentRow}`).value(sale.itemName);                             
                worksheet.cell(`G${currentRow}`).value(Number(sale.quantity || 1));                        
                
                // Format Price: Peso sign at may decimal (e.g., ₱5.00)
                worksheet.cell(`H${currentRow}`)
                         .value(Number(sale.amount))
                         .style("numberFormat", "₱#,##0.00");

                worksheet.cell(`I${currentRow}`).value(sale.paymentMethod);                        
                
                // Lagyan ng border ang buong row at i-center
                ['D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
                    worksheet.cell(`${col}${currentRow}`).style({
                        horizontalAlignment: "center",
                        verticalAlignment: "center",
                        border: {
                            top: { style: "thin", color: "bfbfbf" },
                            bottom: { style: "thin", color: "bfbfbf" },
                            left: { style: "thin", color: "bfbfbf" },
                            right: { style: "thin", color: "bfbfbf" }
                        }
                    });
                });
            });
        }

        const buffer = await workbook.outputAsync();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="SaniVend_Report.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
        });

    } catch (error) {
        console.error("API Excel Error:", error);
        return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
    }
}