export type Language = "ja" | "en";

export type ConsentPageData = {
  readonly consentChallenge: string;
  readonly clientName: string | null;
  readonly requestedScope: readonly string[];
};

export type ConsentDecision =
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

export type Translation = {
  readonly scopes: Readonly<Record<string, string>>;
  readonly ui: UiStrings;
};

export const TRANSLATIONS = {
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

export function selectLanguage(header: string | null): Language {
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

export function isConsentPageData(value: unknown): value is {
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

export function isSameOrigin(value: string, expectedOrigin: string): boolean {
  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}
