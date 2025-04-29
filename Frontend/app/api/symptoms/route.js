import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/symptoms - Get symptoms for a user
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
    const symptoms = await db
      .collection('symptoms')
      .find({ email })
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json({ symptoms }, { status: 200 });
  } catch (error) {
    console.error('Error fetching symptoms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symptoms' },
      { status: 500 }
    );
  }
}

// POST /api/symptoms - Add a new symptom record
export async function POST(request) {
  try {
    const data = await request.json();
    const { email, date, symptoms, severity, notes } = data;

    if (!email || !date || !symptoms || !severity) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('symptoms').insertOne({
      email,
      date,
      symptoms,
      severity,
      notes: notes || '',
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: 'Symptom data saved successfully', id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding symptom:', error);
    return NextResponse.json(
      { error: 'Failed to save symptom data' },
      { status: 500 }
    );
  }
}

// DELETE /api/symptoms - Delete a symptom record
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
    const result = await db.collection('symptoms').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Symptom record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Symptom record deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting symptom record:', error);
    return NextResponse.json(
      { error: 'Failed to delete symptom record' },
      { status: 500 }
    );
  }
}