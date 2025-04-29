import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/periods - Get periods for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const periods = await db
      .collection('periods')
      .find({ email })
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json({ periods }, { status: 200 });
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch periods' },
      { status: 500 }
    );
  }
}

// POST /api/periods - Add a new period
export async function POST(request) {
  try {
    const data = await request.json();
    const { email, startDate, endDate, flow } = data;

    if (!email || !startDate || !endDate || !flow) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('periods').insertOne({
      email,
      startDate,
      endDate,
      flow,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: 'Period data saved successfully', id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding period:', error);
    return NextResponse.json(
      { error: 'Failed to save period data' },
      { status: 500 }
    );
  }
}

// DELETE /api/periods - Delete a period
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('periods').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Period not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Period deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting period:', error);
    return NextResponse.json(
      { error: 'Failed to delete period' },
      { status: 500 }
    );
  }
} 