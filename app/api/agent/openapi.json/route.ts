import { runtime } from '@/src/agent/runtime';
export const GET = (request: Request) => runtime.http.handlers.openapi(request);
