import { getSearchQuery } from "@/iiif";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, res: NextResponse) => {
  const search = req.nextUrl.searchParams.get("q") || "";
  const query = await getSearchQuery();

  let results = [];
  if (search) {
    results = await query.all({ $search: search });
  }

  return NextResponse.json({
    results,
  });
};
