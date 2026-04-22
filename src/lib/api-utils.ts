import { NextResponse } from "next/server";

export function apiResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    { 
      success: false, 
      error: message, 
      ...(details ? { details } : {}) 
    }, 
    { status }
  );
}

export function apiSuccess(message: string, data?: any) {
  return NextResponse.json({
    success: true,
    message,
    ...(data ? { data } : {})
  });
}
