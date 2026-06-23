// app/api/inventory/route.js
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const prisma = new PrismaClient();

// GET
export async function GET(req) {
  try {
    const sessionToken = req.cookies.get('admin_session');
    if (!sessionToken || sessionToken.value !== process.env.SERVER_RUN_ID) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

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

    // Map fields for frontend
    const inventory = rawInventory.map(item => ({
      ...item,
      name: item.productName,
      max: item.maxCapacity,
      price: Number(item.unitPrice),
      threshold: getThreshold(item.slotId)
    }));

    return NextResponse.json(inventory, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching inventory' }, { status: 500 });
  }
}

// PUT (Refill)
export async function PUT(request) {
  try {
    const sessionToken = request.cookies.get('admin_session');
    if (!sessionToken || sessionToken.value !== process.env.SERVER_RUN_ID) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { slotId, newStock, newMax, newPrice } = body;

    const currentItem = await prisma.inventory.findUnique({ where: { slotId: slotId } });
    
    if (!currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const currentStock = currentItem.stock;
    const addedStock = parseInt(newStock) - currentStock;

    const updatedItem = await prisma.inventory.update({
      where: { slotId: slotId },
      data: { 
        stock: parseInt(newStock),
        maxCapacity: parseInt(newMax),
        unitPrice: parseFloat(newPrice),
        lastRefill: addedStock > 0 ? new Date() : currentItem.lastRefill
      }
    });

    if (addedStock > 0) {
      await prisma.refillHistory.create({
        data: {
          slotId: updatedItem.slotId,
          productName: updatedItem.productName,
          addedStock: addedStock,
          newStock: updatedItem.stock
        }
      });
    }

    // ✨ Broadcast updated stock and price to the vending machine immediately
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost';
    const client = mqtt.connect(brokerUrl); 
    client.on('connect', () => {
      client.publish('vending/stock/response', JSON.stringify({
        slotId: updatedItem.slotId, stock: updatedItem.stock, price: Number(updatedItem.unitPrice)
      }));
      client.end();
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error updating inventory' }, { status: 500 });
  }
}