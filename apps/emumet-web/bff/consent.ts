export type ConsentHandlerConfig = {
  readonly emumetApiUrl: string;
  readonly appOrigin: string;
};

type Language = "ja" | "en";

type ConsentPageData = {
  readonly consentChallenge: string;
  readonly clientName: string | null;
  readonly requestedScope: readonly string[];
};

type ConsentDecision =
  | { readonly consent_challenge: string; readonly accept: true; readonly grant_scope: readonly string[] }
  | { readonly consent_challenge: string; readonly accept: false };

type UiStrings = {
  readonly title: string;
  readonly description: string;
  readonly allow: string;
  readonly deny: string;
  readonly genericAppName: string;
  readonly badRequestTitle: string;
  readonly badRequestMessage: string;
  readonly forbiddenTitle: string;
  readonly forbiddenMessage: string;
  readonly upstreamTitle: string;
  readonly upstreamMessage: string;
};

type Translation = {
  readonly scopes: Readonly<Record<string, string>>;
  readonly ui: UiStrings;
};

const TRANSLATIONS = {
  ja: {
    scopes: {
      openid: "基本プロフィール",
      offline_access: "オフラインアクセス",
      email: "メールアドレス",
    },
    ui: {
      title: "アクセスの許可",
      description: "次のアクセスを許可しますか？",
      allow: "許可する",
      deny: "拒否する",
      genericAppName: "このアプリケーション",
      badRequestTitle: "不正なリクエスト",
      badRequestMessage: "リクエストの内容を確認してください。",
      forbiddenTitle: "リクエストを拒否しました",
      forbiddenMessage: "このリクエストは許可されていません。",
      upstreamTitle: "サービスを利用できません",
      upstreamMessage: "しばらくしてからもう一度お試しください。",
    },
  },
  en: {
    scopes: {
      openid: "Basic profile",
      offline_access: "Offline access",
      email: "Email address",
    },
    ui: {
      title: "Authorize access",
      description: "Do you want to allow the following access?",
      allow: "Allow",
      deny: "Deny",
      genericAppName: "This application",
      badRequestTitle: "Invalid request",
      badRequestMessage: "Check the request and try again.",
      forbiddenTitle: "Request denied",
      forbiddenMessage: "This request is not allowed.",
      upstreamTitle: "Service unavailable",
      upstreamMessage: "Please try again later.",
    },
  },
} as const satisfies Record<Language, Translation>;

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
} as const;

function selectLanguage(header: string | null): Language {
  if (header === null) return "ja";
  const preferences = header.split(",").map((part, index) => {
    const [rawLanguage = "", ...parameters] = part.trim().split(";");
    const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const parsedQuality = qualityParameter === undefined
      ? 1
      : Number.parseFloat(qualityParameter.trim().slice(2));
    return {
      language: rawLanguage.toLowerCase().split("-")[0],
      quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
      index,
    };
  });
  preferences.sort((left, right) => right.quality - left.quality || left.index - right.index);
  for (const preference of preferences) {
    if (preference.quality <= 0) continue;
    if (preference.language === "ja" || preference.language === "en") return preference.language;
  }
  return "ja";
}

function errorResponse(language: Language, status: 400 | 403 | 502): Response {
  const ui = TRANSLATIONS[language].ui;
  let content: { readonly title: string; readonly message: string };
  switch (status) {
    case 400:
      content = { title: ui.badRequestTitle, message: ui.badRequestMessage };
      break;
    case 403:
      content = { title: ui.forbiddenTitle, message: ui.forbiddenMessage };
      break;
    case 502:
      content = { title: ui.upstreamTitle, message: ui.upstreamMessage };
      break;
  }
  const body = `<!doctype html>
<html lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${Bun.escapeHTML(content.title)}</title><link rel="stylesheet" href="/style.css"><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1rem;color:#cdd6f4;background:#1e1e2e}main{background:#313244;padding:2rem;border-radius:.75rem}h1{margin-top:0}</style></head>
<body><main><h1>${Bun.escapeHTML(content.title)}</h1><p>${Bun.escapeHTML(content.message)}</p></main></body>
</html>`;
  return new Response(body, { status, headers: HTML_HEADERS });
}

function isConsentPageData(value: unknown): value is {
  readonly action: "show_consent";
  readonly consent_challenge: string;
  readonly client_name: string | null;
  readonly requested_scope: readonly string[];
} {
  if (typeof value !== "object" || value === null) return false;
  if (!("action" in value) || value.action !== "show_consent") return false;
  if (!("consent_challenge" in value) || typeof value.consent_challenge !== "string") return false;
  if (!("client_name" in value) || (typeof value.client_name !== "string" && value.client_name !== null)) return false;
  if (!("requested_scope" in value) || !Array.isArray(value.requested_scope)) return false;
  return value.requested_scope.every((scope) => typeof scope === "string");
}

function renderConsentPage(language: Language, data: ConsentPageData): Response {
  const translation: Translation = TRANSLATIONS[language];
  const clientName = data.clientName ?? translation.ui.genericAppName;
  const scopes = data.requestedScope.map((scope, index) => {
    const label = translation.scopes[scope] ?? scope;
    return `<li><input id="scope-${index}" type="checkbox" name="grant_scope" value="${Bun.escapeHTML(scope)}" checked><label for="scope-${index}">${Bun.escapeHTML(label)}</label></li>`;
  }).join("");
  const body = `<!doctype html>
<html lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${Bun.escapeHTML(translation.ui.title)}</title><link rel="stylesheet" href="/style.css"><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1rem;color:#cdd6f4;background:#1e1e2e}main{background:#313244;padding:2rem;border-radius:.75rem}h1{margin-top:0}ul{list-style:none;padding:0}li{display:flex;gap:.75rem;margin:1rem 0}button{margin-right:.75rem;padding:.65rem 1rem}</style></head>
<body><main><h1>${Bun.escapeHTML(translation.ui.title)}</h1><p><strong>${Bun.escapeHTML(clientName)}</strong></p><p>${Bun.escapeHTML(translation.ui.description)}</p><form method="post" action="/oauth2/consent"><input type="hidden" name="consent_challenge" value="${Bun.escapeHTML(data.consentChallenge)}"><ul>${scopes}</ul><button type="submit" name="decision" value="allow">${Bun.escapeHTML(translation.ui.allow)}</button><button type="submit" name="decision" value="deny">${Bun.escapeHTML(translation.ui.deny)}</button></form></main></body>
</html>`;
  return new Response(body, { status: 200, headers: HTML_HEADERS });
}

function redirectResponse(response: Response): Response | null {
  const location = response.headers.get("location");
  return location === null ? null : new Response(null, { status: 302, headers: { Location: location } });
}

function isSameOrigin(value: string, expectedOrigin: string): boolean {
  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function passesCsrf(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) return isSameOrigin(origin, expectedOrigin);
  const referer = request.headers.get("referer");
  return referer !== null && isSameOrigin(referer, expectedOrigin);
}

async function parseDecision(request: Request): Promise<ConsentDecision | null> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return null;
  }
  const challenge = form.get("consent_challenge");
  const decision = form.get("decision");
  if (typeof challenge !== "string" || challenge.length === 0 || typeof decision !== "string") return null;
  switch (decision) {
    case "allow": {
      const scopes = form.getAll("grant_scope");
      if (!scopes.every((scope) => typeof scope === "string")) return null;
      return { consent_challenge: challenge, accept: true, grant_scope: scopes };
    }
    case "deny":
      return { consent_challenge: challenge, accept: false };
    default:
      return null;
  }
}

async function handlePost(
  request: Request,
  config: ConsentHandlerConfig,
  language: Language,
): Promise<Response> {
  if (!passesCsrf(request, new URL(config.appOrigin).origin)) return errorResponse(language, 403);
  const decision = await parseDecision(request);
  if (decision === null) return errorResponse(language, 400);
  try {
    const upstream = await fetch(`${config.emumetApiUrl}/oauth2/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision),
      redirect: "manual",
    });
    if (upstream.status === 302) return redirectResponse(upstream) ?? errorResponse(language, 502);
    if (upstream.status === 400) return errorResponse(language, 400);
    return errorResponse(language, 502);
  } catch {
    return errorResponse(language, 502);
  }
}

export function createConsentHandler(config: ConsentHandlerConfig): (request: Request) => Promise<Response> {
  return async (request) => {
    const language = selectLanguage(request.headers.get("accept-language"));
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
    }
    if (request.method === "POST") return handlePost(request, config, language);

    const challenge = new URL(request.url).searchParams.get("consent_challenge");
    if (challenge === null || challenge.length === 0) return errorResponse(language, 400);

    try {
      const upstream = await fetch(`${config.emumetApiUrl}/oauth2/consent?consent_challenge=${encodeURIComponent(challenge)}`, {
        redirect: "manual",
      });
      if (upstream.status === 302) return redirectResponse(upstream) ?? errorResponse(language, 502);
      if (upstream.status !== 200) return errorResponse(language, 502);
      const data: unknown = await upstream.json();
      if (!isConsentPageData(data)) return errorResponse(language, 502);
      return renderConsentPage(language, {
        consentChallenge: data.consent_challenge,
        clientName: data.client_name,
        requestedScope: data.requested_scope,
      });
    } catch {
      return errorResponse(language, 502);
    }
  };
}
