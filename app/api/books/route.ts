import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'http://data4library.kr/api';
const API_KEY = process.env.DATA4LIBRARY_API_KEY;
const ALADIN_TTB_KEY = process.env.ALADIN_TTB_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const query = searchParams.get('query');
  const isbn = searchParams.get('isbn');

  try {
    // 1. 알라딘 API 키가 있고 저자 또는 키워드 검색인 경우 알라딘 우선 처리
    if (ALADIN_TTB_KEY && (type === 'author' || type === 'keyword') && query) {
      const queryType = type === 'author' ? 'Author' : 'Keyword';
      const aladinUrl = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_TTB_KEY}&Query=${encodeURIComponent(query)}&QueryType=${queryType}&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
      
      const aladinRes = await fetch(aladinUrl, { next: { revalidate: 3600 } });
      if (aladinRes.ok) {
        const aladinData = await aladinRes.json();
        const items = aladinData?.item ?? [];
        const books = items.map((item: any) => ({
          title: item.title,
          author: item.author,
          publisher: item.publisher,
          year: item.pubDate ? item.pubDate.slice(0, 4) : '',
          isbn: item.isbn13 || item.isbn,
          coverUrl: item.cover || null,
          description: item.description || null,
        }));
        return NextResponse.json({ books });
      }
    }

    // 2. 정보나루(Data4Library) API가 있는 경우 폴백 또는 기본 처리
    if (API_KEY) {
      if (type === 'author' && query) {
        const parseBooks = (docs: { doc: Record<string, string> }[]) =>
          docs.map((d) => ({
            title: d.doc.TITLE,
            author: d.doc.AUTHOR,
            publisher: d.doc.PUBLISHER,
            year: d.doc.PUBLICATION_YEAR,
            isbn: d.doc.ISBN13,
            coverUrl: d.doc.COVER_SMALL_URL || null,
            description: d.doc.DESCRIPTION || null,
          }));

        // 1차: author 필드로 검색
        const authorUrl = `${BASE_URL}/srchBooks?authKey=${API_KEY}&author=${encodeURIComponent(query)}&format=json&pageSize=10`;
        const authorRes = await fetch(authorUrl, { next: { revalidate: 3600 } });
        const authorData = await authorRes.json();
        const authorDocs = authorData?.response?.docs ?? [];

        if (authorDocs.length > 0) {
          return NextResponse.json({ books: parseBooks(authorDocs) });
        }

        // 2차 폴백: keyword로 검색 (이민진처럼 외국 거주 작가 대응)
        const kwUrl = `${BASE_URL}/srchBooks?authKey=${API_KEY}&keyword=${encodeURIComponent(query)}&format=json&pageSize=10`;
        const kwRes = await fetch(kwUrl, { next: { revalidate: 3600 } });
        const kwData = await kwRes.json();
        const kwDocs = kwData?.response?.docs ?? [];
        return NextResponse.json({ books: parseBooks(kwDocs) });
      }

      if (type === 'related' && isbn) {
        // 이 책 빌린 사람이 같이 빌린 책 (핵심 기능)
        const url = `${BASE_URL}/usageAnalysisList?authKey=${API_KEY}&isbn13=${isbn}&format=json&loaninfoYN=N&bookDtlInfoYN=Y`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        const data = await res.json();
        const coLoanBooks = data?.response?.loanBooks?.book ?? [];
        const books = coLoanBooks.slice(0, 8).map((b: Record<string, string>) => ({
          title: b.bookname,
          author: b.authors,
          isbn: b.isbn13,
          coverUrl: b.bookImageURL || null,
          ranking: b.ranking,
        }));
        return NextResponse.json({ books });
      }

      if (type === 'keyword' && query) {
        // 키워드로 도서 검색
        const url = `${BASE_URL}/srchBooks?authKey=${API_KEY}&keyword=${encodeURIComponent(query)}&format=json&pageSize=8`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        const data = await res.json();
        const docs = data?.response?.docs ?? [];
        const books = docs.map((d: { doc: Record<string, string> }) => ({
          title: d.doc.TITLE,
          author: d.doc.AUTHOR,
          publisher: d.doc.PUBLISHER,
          year: d.doc.PUBLICATION_YEAR,
          isbn: d.doc.ISBN13,
          coverUrl: d.doc.COVER_SMALL_URL || null,
        }));
        return NextResponse.json({ books });
      }
    }

    // 3. API 키가 없거나 호출에 실패한 경우 Mock 데이터 반환 (클라이언트 크래시 방지)
    return NextResponse.json({
      books: [
        {
          title: `${query || '알 수 없는'} 관련 추천 도서 (API 대기 중)`,
          author: '시스템',
          publisher: '스크립트체인',
          year: '2026',
          isbn: '0000000000',
          coverUrl: null,
          description: 'API 키 등록이 완료되면 실시간 데이터로 노출됩니다.'
        }
      ]
    });
  } catch (e) {
    console.error('도서 API 오류:', e);
    return NextResponse.json({ error: 'API 호출 실패' }, { status: 500 });
  }
}
