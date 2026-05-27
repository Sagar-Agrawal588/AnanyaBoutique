const BACKEND_URL = String(
  process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://healthy-one-gram.el.r.appspot.com",
)
  .trim()
  .replace(/\/+$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "transfer-encoding",
  "upgrade",
]);

const buildTargetUrl = async (request, params) => {
  const resolvedParams = await params;
  const parts = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];
  const requestUrl = new URL(request.url);
  const target = new URL(`/${parts.join("/")}`, BACKEND_URL);
  target.search = requestUrl.search;
  return target;
};

const buildRequestHeaders = (request) => {
  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  return headers;
};

const proxyRequest = async (request, context) => {
  const target = await buildTargetUrl(request, context.params);
  const method = request.method.toUpperCase();
  const init = {
    method,
    headers: buildRequestHeaders(request),
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers(upstream.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => responseHeaders.delete(header));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
