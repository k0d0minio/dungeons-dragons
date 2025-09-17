import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Test a simple query
    const userCount = await prisma.user.count();
    
    return Response.json({ 
      success: true, 
      message: 'Database connected successfully',
      userCount 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
