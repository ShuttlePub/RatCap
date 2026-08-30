# E2E JWT fixtures (TEST-ONLY)

These files are committed test fixtures, mirroring Booskiff core's committed
test-only key material. They are **not secrets**:

- `jwtRS256.pkcs8.pem` — RSA-2048 private key, PKCS8 PEM. The BFF signs mock
  session JWTs with it (`TEST_JWT_PRIVATE_KEY_PEM_BASE64`, injected as an env
  var at runtime by `scripts/e2e.sh` / compose — never baked into the image).
- `jwks.json` — the matching public JWK Set (single key, `kid: test-key`,
  `alg: RS256`, `use: sig`). Served by the BFF at `/.well-known/jwks.json` via
  `TEST_JWT_JWKS_JSON` and trusted by Booskiff core through
  `BOOSKIFF_JWT_TRUSTED_ISSUERS`.
- `verify.ts` — roundtrip check: signs a sample JWT with the PKCS8 key via
  WebCrypto and verifies it against the JWKS. Run it after regenerating:

  ```bash
  bun e2e/fixtures/verify.ts   # from apps/booskiff-web; must print OK
  ```

## Regenerating

Any RSA-2048 keypair works (the stack wires key + JWKS together at runtime).
On a machine with openssl:

```bash
cd apps/booskiff-web/e2e/fixtures

# 1. Private key (PKCS8 PEM)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwtRS256.pkcs8.pem

# 2. Matching JWKS (single key, kid test-key)
bun -e 'const {createPublicKey,readFileSync,writeFileSync}=require("node:crypto");const jwk=createPublicKey(readFileSync("jwtRS256.pkcs8.pem")).export({format:"jwk"});writeFileSync("jwks.json",JSON.stringify({keys:[{kty:"RSA",alg:"RS256",use:"sig",kid:"test-key",n:jwk.n,e:jwk.e}]},null,2)+"\n")'

# 3. Verify the pair
bun run verify.ts
```

Note: hosts without an `openssl` CLI (e.g. some NixOS setups) can generate the
keypair with Bun directly — the artifacts are byte-compatible PKCS8/JWK:

```bash
bun -e 'const {generateKeyPairSync,createPublicKey,writeFileSync}=require("node:crypto");const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}});const jwk=createPublicKey(publicKey).export({format:"jwk"});writeFileSync("jwtRS256.pkcs8.pem",privateKey);writeFileSync("jwks.json",JSON.stringify({keys:[{kty:"RSA",alg:"RS256",use:"sig",kid:"test-key",n:jwk.n,e:jwk.e}]},null,2)+"\n")'
```
