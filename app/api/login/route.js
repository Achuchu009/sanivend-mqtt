import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    // 1. Find the admin user in the database
    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    // 2. Verify the password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    // 3. Create a response and set the secure HTTP-only cookie
    const response = NextResponse.json({ success: true, message: 'Login successful' });
    
    response.cookies.set({
      name: 'admin_session',
      value: 'active', // In a larger app, this would be a secure JWT string
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 // Expires in 1 day
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: 'Server error during login' }, { status: 500 });
  }
}
