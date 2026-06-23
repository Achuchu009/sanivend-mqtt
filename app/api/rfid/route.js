// app/api/rfid/route.js
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const type = searchParams.get('type');

  try {
    // -------------------------------------------
    // A. FETCH TRANSACTION HISTORY (For Top-Up Page)
    // -------------------------------------------
    if (type === 'history') {
      const history = await prisma.rFIDTransaction.findMany({
        where: uid ? { cardUid: uid } : {},
        orderBy: { createdAt: 'desc' },
        take: 10 
      });
      return NextResponse.json(history);
    }

    // -------------------------------------------
    // B. FETCH RECENT REGISTRATIONS (For Register Page) -> ITO YUNG NAWALA KANINA
    // -------------------------------------------
    if (type === 'recent') {
        const recentCards = await prisma.rFIDCard.findMany({
          orderBy: { id: 'desc' }, // Newest ID first
          take: 5
        });
        return NextResponse.json(recentCards);
    }

    // -------------------------------------------
    // C. FIND SPECIFIC CARD (For Scanning)
    // -------------------------------------------
    if (!uid) {
        // If type is not history/recent and UID is missing, return empty array 
        // to prevent .map() crashes on frontend, or return specific error.
        // Returning 400 ensures SWR handles it as error, but we must handle it on UI.
        return NextResponse.json({ error: 'UID required' }, { status: 400 });
    }

    const card = await prisma.rFIDCard.findUnique({
      where: { uid: uid }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not registered' }, { status: 404 });
    }

    return NextResponse.json(card);

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

// POST: Register New Card
export async function POST(request) {
    try {
      const body = await request.json();
      const { uid, owner, initialBalance } = body;
  
      const existing = await prisma.rFIDCard.findUnique({ where: { uid } });
      if (existing) {
          return NextResponse.json({ error: 'Card already registered' }, { status: 400 });
      }
  
      const newCard = await prisma.rFIDCard.create({
        data: {
          uid,
          owner: owner || "Student",
          balance: parseFloat(initialBalance || 0),
          lastLoaded: new Date()
        }
      });
  
      return NextResponse.json({ success: true, card: newCard });
    } catch (error) {
      return NextResponse.json({ error: 'Registration Failed' }, { status: 500 });
    }
}

// PUT: Top-Up & Sync
export async function PUT(request) {
    try {
        const body = await request.json();
        const { uid, newBalance, addedAmount, status } = body;
    
        // 1. UPDATE CARD BALANCE (Only if Success)
        if (status === 'Success') {
            await prisma.rFIDCard.update({
                where: { uid },
                data: { balance: parseFloat(newBalance), lastLoaded: new Date() }
            });
        }
    
        // 2. CREATE TRANSACTION LOG
        if (addedAmount && parseFloat(addedAmount) > 0) {
            await prisma.rFIDTransaction.create({
                data: {
                    cardUid: uid,
                    amount: parseFloat(addedAmount),
                    status: status || "Success"
                }
            });
        }
    
        return NextResponse.json({ success: true });
      } catch (error) {
        return NextResponse.json({ error: 'Sync Failed' }, { status: 500 });
      }
}

// PATCH: Update Owner Name (Edit)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, owner } = body;

    const updatedCard = await prisma.rFIDCard.update({
      where: { id: parseInt(id) },
      data: { owner: owner }
    });

    return NextResponse.json({ success: true, card: updatedCard });
  } catch (error) {
    return NextResponse.json({ error: 'Update Failed' }, { status: 500 });
  }
}

// DELETE: Remove Card
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;

    await prisma.rFIDCard.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete Failed' }, { status: 500 });
  }
}