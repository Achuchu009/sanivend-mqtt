import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET: Fetch recent refill history
export async function GET(req) {
  try {
    const sessionToken = req.cookies.get('admin_session');
    if (!sessionToken || sessionToken.value !== process.env.SERVER_RUN_ID) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const history = await prisma.refillHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50 // Fetch the last 50 refills
    });

    return NextResponse.json(history, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching refill history' }, { status: 500 });
  }
}
