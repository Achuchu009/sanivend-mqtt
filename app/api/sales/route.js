// app/api/sales/route.js
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  const now = new Date();
  const selectedMonth = parseInt(searchParams.get('month') || now.getMonth());
  const selectedYear = parseInt(searchParams.get('year') || now.getFullYear());

  try {
    // 1. Define Date Range
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    // 2. Fetch Sales for the SELECTED Period
    const rawSales = await prisma.sales.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Format data and ensure quantity is read correctly
    const sales = rawSales.map(sale => ({
      ...sale,
      amount: Number(sale.amount),
      quantity: sale.quantity || 1 // Babasahin nito yung totoong quantity sa database
    }));

    // --- CALCULATIONS (UPDATED WITH QUANTITY) ---

    // A. Totals
    const periodRevenue = sales.reduce((sum, item) => sum + item.amount, 0);
    // BINAGO: Iko-compute niya ang totoong quantity, hindi lang yung dami ng rows
    const periodItems = sales.reduce((sum, item) => sum + item.quantity, 0); 

    // B. Most Popular Item
    const itemCounts = {};
    sales.forEach(sale => {
        // BINAGO: Ginamit ang quantity multiplier para tama ang bilang ng sikat na item
        itemCounts[sale.itemName] = (itemCounts[sale.itemName] || 0) + sale.quantity;
    });
    
    let popularItem = "N/A";
    let maxCount = 0;
    Object.entries(itemCounts).forEach(([name, count]) => {
        if (count > maxCount) {
            maxCount = count;
            popularItem = name;
        }
    });

    // C. Graph Data: Daily Trend (Line Chart)
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const graphData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dailyTotal = sales
        .filter(sale => sale.createdAt.toISOString().startsWith(dateStr))
        .reduce((sum, item) => sum + item.amount, 0);
      return { day: day, sales: dailyTotal };
    });

    // D. Payment Method Data (Donut Chart)
    const paymentStats = [
        { name: 'Cash', value: sales.filter(s => s.paymentMethod === 'Cash' || s.paymentMethod === 'COIN').length },
        { name: 'RFID', value: sales.filter(s => s.paymentMethod === 'RFID').length }
    ];

    // E. Product Breakdown (Bar Chart)
    const productStats = Object.keys(itemCounts).map(key => ({
        name: key,
        value: itemCounts[key]
    }));

    return NextResponse.json({ 
      sales, 
      periodRevenue, 
      periodItems,
      popularItem, 
      graphData,
      paymentStats, 
      productStats  
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error("Sales API Error:", error);
    return NextResponse.json({ error: 'Error fetching sales logs' }, { status: 500 });
  }
}