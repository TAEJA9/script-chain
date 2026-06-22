import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

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

// 차승원 등 유명 배우/작품 폴백용 검색 데이터
const MOCK_MOVIES_DB: Record<string, NaverMovie[]> = {
  '차승원': [
    { title: '낙원의 밤', link: 'https://netflix.com', image: '', subtitle: 'Night in Paradise', pubDate: '2020', director: '박훈정', actor: '차승원|엄태구|전여빈', userRating: '8.2' },
    { title: '싱크홀', link: 'https://tving.com', image: '', subtitle: 'Sinkhole', pubDate: '2021', director: '김지훈', actor: '차승원|김성균|이광수', userRating: '7.8' },
    { title: '독전 2', link: 'https://netflix.com', image: '', subtitle: 'Believer 2', pubDate: '2023', director: '백종열', actor: '조진웅|차승원|한효주', userRating: '6.5' },
    { title: '삼시세끼 어촌편', link: 'https://tving.com', image: '', subtitle: 'Three Meals a Day', pubDate: '2020', director: '나영석', actor: '차승원|유해진|손호준', userRating: '9.5' },
  ],
  '김태리': [
    { title: '정년이', link: 'https://tving.com', image: '/posters/jeongnyon.jpg', subtitle: 'Jeongnyon', pubDate: '2024', director: '정지인', actor: '김태리|신예은|라미란', userRating: '9.2' },
    { title: '아가씨', link: 'https://watcha.com', image: '', subtitle: 'The Handmaiden', pubDate: '2016', director: '박찬욱', actor: '김민희|김태리|하정우', userRating: '8.7' },
    { title: '스물다섯 스물하나', link: 'https://netflix.com', image: '', subtitle: 'Twenty-Five Twenty-One', pubDate: '2022', director: '정지현', actor: '김태리|남주혁|보나', userRating: '8.9' },
    { title: '외계+인 1부', link: 'https://tving.com', image: '', subtitle: 'Alienoid', pubDate: '2022', director: '최동훈', actor: '류준열|김우빈|김태리', userRating: '7.1' },
  ]
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  const display = request.nextUrl.searchParams.get('display') ?? '10';

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다' }, { status: 400 });
  }

  // 1. 네이버 API 호출 시도 (키가 있는 경우)
  if (CLIENT_ID && CLIENT_SECRET) {
    try {
      const url = `https://openapi.naver.com/v1/search/movie.json?query=${encodeURIComponent(query)}&display=${display}`;
      const res = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
        },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
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
    } catch (e) {
      console.warn('네이버 API 호출 실패, 폴백 사용:', e);
    }
  }

  // 2. API가 불가능하거나 실패한 경우 Mock DB 또는 생성형 폴백 데이터 반환
  const cleanedQuery = query.trim();
  const matched = MOCK_MOVIES_DB[cleanedQuery];
  
  if (matched) {
    return NextResponse.json({ total: matched.length, movies: matched });
  }

  // 기타 인물/작품 검색 시 동적 생성 데이터 반환
  const genericMovies: NaverMovie[] = [
    {
      title: `${cleanedQuery} 대표작 A`,
      link: 'https://netflix.com',
      image: '',
      subtitle: 'Representative Work A',
      pubDate: '2024',
      director: '감독 X',
      actor: `${cleanedQuery}|배우 Y|배우 Z`,
      userRating: '8.5'
    },
    {
      title: `${cleanedQuery} 대표작 B`,
      link: 'https://tving.com',
      image: '',
      subtitle: 'Representative Work B',
      pubDate: '2023',
      director: '감독 Y',
      actor: `배우 A|${cleanedQuery}`,
      userRating: '7.9'
    }
  ];

  return NextResponse.json({ total: genericMovies.length, movies: genericMovies });
}
