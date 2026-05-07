import { NextRequest, NextResponse } from "next/server";

// 모든 페이지/API 공개 접근 허용
// 관리자 작업(게임 등록/삭제, AI 생성)은 각 API 라우트에서 비밀번호로 개별 검증
export async function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
