#!/usr/bin/env bun
/**
 * Register OAuth2 client for Ratcap BFF in Hydra.
 *
 * Usage:
 *   bun scripts/register-hydra-client.ts
 *
 * Environment variables:
 *   HYDRA_ADMIN_URL   — Hydra admin API (default: http://localhost:4445)
 *   APP_ORIGIN        — Ratcap origin (default: http://localhost:3000)
 *   HYDRA_CLIENT_ID   — Client ID (default: ratcap-bff)
 *   HYDRA_CLIENT_SECRET — Client secret (default: dev-secret)
 */

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://localhost:4445";
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
const CLIENT_ID = process.env.HYDRA_CLIENT_ID || "ratcap-bff";
const CLIENT_SECRET = process.env.HYDRA_CLIENT_SECRET || "dev-secret";

const clientPayload = {
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  client_name: "Ratcap BFF",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  scope: "openid offline_access email",
  redirect_uris: [`${APP_ORIGIN}/auth/callback`],
  token_endpoint_auth_method: "client_secret_basic",
  skip_consent: true,
  audience: ["account"],
};

async function main() {
  console.log(`Registering OAuth2 client "${CLIENT_ID}" at ${HYDRA_ADMIN_URL}...`);

  // Check if client already exists
  const getResp = await fetch(`${HYDRA_ADMIN_URL}/admin/clients/${CLIENT_ID}`);
  if (getResp.ok) {
    console.log(`Client "${CLIENT_ID}" already exists. Updating...`);
    const putResp = await fetch(`${HYDRA_ADMIN_URL}/admin/clients/${CLIENT_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload),
    });
    if (!putResp.ok) {
      console.error("Failed to update client:", putResp.status, await putResp.text());
      process.exit(1);
    }
    const updated = await putResp.json();
    console.log("Client updated:", JSON.stringify(updated, null, 2));
    return;
  }

  // Create new client
  const postResp = await fetch(`${HYDRA_ADMIN_URL}/admin/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientPayload),
  });
  if (!postResp.ok) {
    console.error("Failed to create client:", postResp.status, await postResp.text());
    process.exit(1);
  }
  const created = await postResp.json();
  console.log("Client created:", JSON.stringify(created, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
