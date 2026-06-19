import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;

export interface NaverMovie {
  title: string;
  link: string;
  image: string;
  subtitle: string;
  pubDate: string;
  director: string;
  actor: string;
  userRating: string;
  genre?: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  const display = request.nextUrl.searchParams.get('display') ?? '10';

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다' }, { status: 400 });
  }

  const url = `https://openapi.naver.com/v1/search/movie.json?query=${encodeURIComponent(query)}&display=${display}`;

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
  const clean = (str: string) => str.replace(/<[^>]+>/g, '').trim();

  const movies: NaverMovie[] = (data.items ?? []).map((item: Record<string, string>) => ({
    title: clean(item.title),
    link: item.link,
    image: item.image,
    subtitle: clean(item.subtitle ?? ''),
    pubDate: item.pubDate,
    director: clean(item.director ?? ''),
    actor: clean(item.actor ?? ''),
    userRating: item.userRating ?? '0',
  }));

  return NextResponse.json({ total: data.total, movies });
}
