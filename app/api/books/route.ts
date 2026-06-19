import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'http://data4library.kr/api';
const API_KEY = process.env.DATA4LIBRARY_API_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const query = searchParams.get('query');
  const isbn = searchParams.get('isbn');

  try {
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

    return NextResponse.json({ error: 'type 파라미터가 필요합니다 (author | related | keyword)' }, { status: 400 });
  } catch (e) {
    console.error('도서관 API 오류:', e);
    return NextResponse.json({ error: 'API 호출 실패' }, { status: 500 });
  }
}
