import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const filePath = path.join(process.cwd(), 'prometheus.yml');
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'application/x-yaml',
      },
    });
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}
