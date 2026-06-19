import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;

export interface NaverBook {
  title: string;
  link: string;
  image: string;
  author: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  const display = request.nextUrl.searchParams.get('display') ?? '10';

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다' }, { status: 400 });
  }

  const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`;

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': CLIENT_ID,
      'X-Naver-Client-Secret': CLIENT_SECRET,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: '네이버 API 오류' }, { status: res.status });
  }

  const data = await res.json();
  // HTML 태그 제거
  const clean = (str: string) => str.replace(/<[^>]+>/g, '').trim();

  const books: NaverBook[] = (data.items ?? []).map((item: Record<string, string>) => ({
    title: clean(item.title),
    link: item.link,
    image: item.image,
    author: clean(item.author),
    publisher: clean(item.publisher),
    pubdate: item.pubdate,
    isbn: item.isbn,
    description: clean(item.description),
  }));

  return NextResponse.json({ total: data.total, books });
}
