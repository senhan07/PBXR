import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type === 'prometheus') {
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

  if (type === 'json') {
    const filePath = path.join(process.cwd(), 'targets.json');
    try {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      return new NextResponse(fileContents, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new NextResponse('File not found', { status: 404 });
    }
  }

  return new NextResponse('Invalid probe type', { status: 400 });
}
