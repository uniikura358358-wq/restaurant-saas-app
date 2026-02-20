import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    try {
        // Google Drive の共有リンクを直リンクに変換する簡易ロジック
        let fetchUrl = targetUrl;
        if (targetUrl.includes('drive.google.com/file/d/')) {
            const fileId = targetUrl.split('/d/')[1]?.split('/')[0];
            if (fileId) {
                fetchUrl = `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
            }
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('画像をフェッチできませんでした');

        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'image/png';

        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            },
        });
    } catch (error: any) {
        console.error('Image Proxy Error:', error);
        return NextResponse.json({ error: '画像の取得に失敗しました' }, { status: 500 });
    }
}
