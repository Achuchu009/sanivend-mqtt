// app/api/notifications/route.js
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const sessionToken = request.cookies.get('admin_session');
    if (!sessionToken || sessionToken.value !== process.env.SERVER_RUN_ID) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Fetch Inventory
    const inventory = await prisma.inventory.findMany();

    // Fetch system settings to get custom thresholds
    const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    const getThreshold = (slotId) => {
      if (!settings) return 5;
      if (slotId === 'slot1') return settings.slot1Threshold;
      if (slotId === 'slot2') return settings.slot2Threshold;
      if (slotId === 'slot3') return settings.slot3Threshold;
      if (slotId === 'slot4') return settings.slot4Threshold;
      return 5;
    };

    const enableLowStock = settings ? settings.lowStockAlerts : true;
    const enableErrors = settings ? settings.errorAlerts : true;
    const showPopup = settings ? settings.showPopup : true;

    let lowStockItems = [];
    let outOfStockItems = [];
    let lowStockNames = "";
    let outOfStockNames = "";

    if (enableLowStock) {
      // Filter: Low Stock (Based on custom threshold)
      lowStockItems = inventory.filter(item => item.stock > 0 && item.stock <= getThreshold(item.slotId));
      lowStockNames = [...new Set(lowStockItems.map(item => item.productName))].join(", ");

      // Filter: Out of Stock (0 items)
      outOfStockItems = inventory.filter(item => item.stock === 0);
      outOfStockNames = [...new Set(outOfStockItems.map(item => item.productName))].join(", ");
    }

    let activeErrorLogs = [];
    let errorMessages = "";

    if (enableErrors) {
      // 2. Fetch Active Errors (Status = 'Open')
      activeErrorLogs = await prisma.systemLogs.findMany({
        where: { status: { startsWith: 'Open' } },
        select: { message: true } 
      });

      const errorCounts = {};
      activeErrorLogs.forEach(log => {
          errorCounts[log.message] = (errorCounts[log.message] || 0) + 1;
      });
      errorMessages = Object.entries(errorCounts)
          .map(([msg, count]) => count > 1 ? `${msg} (${count})` : msg)
          .join(", ");
    }

    return NextResponse.json({ 
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockNames,
      outOfStockCount: outOfStockItems.length,
      outOfStockNames: outOfStockNames,
      activeErrors: activeErrorLogs.length,
      errorMessages: errorMessages,
      showPopup: showPopup,
      enableLowStock: enableLowStock,
      enableErrors: enableErrors
    });

  } catch (error) {
    console.error("Notification API Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}