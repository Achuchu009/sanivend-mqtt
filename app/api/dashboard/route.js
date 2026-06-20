// app/api/dashboard/route.js
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const sessionToken = req.cookies.get('admin_session');
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Get Inventory
    const rawInventory = await prisma.inventory.findMany({ orderBy: { slotId: 'asc' } });
    const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    
    // Helper function to match the slotId to its specific threshold setting
    const getThreshold = (slotId) => {
      if (!settings) return 0;
      if (slotId === 'slot1') return settings.slot1Threshold;
      if (slotId === 'slot2') return settings.slot2Threshold;
      if (slotId === 'slot3') return settings.slot3Threshold;
      if (slotId === 'slot4') return settings.slot4Threshold;
      return 0;
    };

    const inventory = rawInventory.map(item => ({
      ...item,
      name: item.productName, 
      max: item.maxCapacity,  
      price: Number(item.unitPrice),
      threshold: getThreshold(item.slotId)
    }));

    // 2. Get Sales (Today only)
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const sales = await prisma.sales.findMany({
      where: { createdAt: { gte: today } }
    });
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.amount), 0);

    // 3. Get ALL Logs para ma-check yung "Offline" status
    const allLogs = await prisma.systemLogs.findMany({
      orderBy: { timestamp: 'desc' }
    });

    // Kukunin lang natin yung top 3 para ipakita sa mismong Dashboard list
    const recentLogs = allLogs.slice(0, 3);

    // --- TOTOONG LOGIC BASE SA ERROR PAGE ---
    // Hahanapin niya kung may error na "Open" at may salitang "offline"
    const isOffline = allLogs.some(log => 
        log.message.toLowerCase().includes('offline') && 
        log.status === 'Open'
    );
    
    // Kapag may offline error, magiging false ito. Kapag resolved na, magiging true (ONLINE)!
    const isMachineConnected = !isOffline;

    return NextResponse.json({ 
      inventory, 
      totalSales, 
      logs: recentLogs,
      isMachineConnected 
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }
}