import { runtime } from '@/src/agent/runtime';
export const POST = (request: Request, context: { params: Promise<{ key: string }> }) => context.params.then(params => runtime.http.handlers.stream(request, params));
