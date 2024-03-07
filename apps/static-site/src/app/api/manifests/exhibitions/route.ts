import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, res: NextResponse) => {
  return NextResponse.json({
    results: [],
  });
};
