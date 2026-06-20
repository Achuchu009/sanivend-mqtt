// app/api/stock/[slotId]/route.js
import { prisma } from '@/lib/db'; // Use the global client
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    // FIX: Await params before using them (Next.js 15 requirement)
    const { slotId } = await params;

    const item = await prisma.inventory.findUnique({
      where: { slotId: slotId }
    });

    if (!item) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // Return data formatted for ESP32
    return NextResponse.json({ 
      slotId: item.slotId,
      productName: item.productName,
      unitPrice: Number(item.unitPrice), // Convert Decimal to Number
      stock: item.stock,
      maxCapacity: item.maxCapacity
    });

  } catch (error) {
    console.error('Stock API Error:', error); // Check VS Code Terminal for details
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}