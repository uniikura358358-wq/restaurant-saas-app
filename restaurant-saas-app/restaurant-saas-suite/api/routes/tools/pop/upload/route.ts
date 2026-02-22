import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

import { verifyAuth } from '@/lib/auth-utils';
import { enforceSubscriptionLock } from '@/lib/subscription-server';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await enforceSubscriptionLock(user.uid, 'ai_api');

        const { image } = await req.json();
        if (!image) return NextResponse.json({ error: '画像が必要です' }, { status: 400 });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const fileName = `pop/${user.uid}/${uuidv4()}.png`;
        const file = adminStorage.bucket().file(fileName);

        await file.save(buffer, {
            metadata: { contentType: 'image/png' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${fileName}`;

        return NextResponse.json({ url: publicUrl });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
    }
}
