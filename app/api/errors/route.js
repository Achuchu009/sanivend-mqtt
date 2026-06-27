// app/api/errors/route.js
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// 1. GET: Fetch logs & Check Connection Status
export async function GET() {
  try {
    const logs = await prisma.systemLogs.findMany({
      orderBy: { timestamp: 'desc' }
    });
    
    // Count Active Errors (Excluding Connectivity logs if you want, or keep them)
    const activeCount = logs.filter(log => log.status.startsWith('Open')).length;

    // CHECK CONNECTION: Is there an active 'NET_01' error?
    // If YES -> Machine is Offline. If NO -> Machine is Online.
    const offlineLog = logs.find(log => log.errorCode === 'NET_01' && log.status.startsWith('Open'));
    const isMachineConnected = !offlineLog; 

    return NextResponse.json({ 
        logs, 
        activeCount, 
        isMachineConnected // <--- Sending this status to Frontend
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    return NextResponse.json({ error: 'Error fetching logs' }, { status: 500 });
  }
}

// 2. PUT: Update status (Toggle between Open/Resolved)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status } = body; // <--- Accept 'status' from frontend

    const updatedLog = await prisma.systemLogs.update({
      where: { id: parseInt(id) },
      data: { status: status } // <--- Save the new status
    });

    return NextResponse.json({ success: true, log: updatedLog });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating log' }, { status: 500 });
  }
}
// 3. DELETE: Remove logs (Supports Single or Bulk)
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { ids } = body; // Expecting an array of IDs

    if (!ids || !Array.isArray(ids)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Delete multiple records
    await prisma.systemLogs.deleteMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting logs' }, { status: 500 });
  }
}