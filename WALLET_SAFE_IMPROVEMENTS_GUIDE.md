# Wallet-Safe Improvements Guide

This guide documents the priority order and implementation steps for security and reliability improvements that do not change wallet signing logic or contract methods.

## Priority Order

1. Secret management and backend hardening
2. Network guardrails and wallet event handling
3. Input validation and transaction UX visibility
4. IPFS retrieval fallback
5. Centralized contract/network config
6. Observability and operational checks

## What has been implemented

- Pinata secrets moved to environment variables in backend.
- Redis-backed OTP store with TTL (and dev-safe memory fallback if Redis is not configured).
- Upload limits and MIME allowlist checks with friendly API errors.
- Structured JSON logging for upload/OTP/unpin/server lifecycle events.
- Frontend network guardrails for Sepolia with switch prompt.
- Recipient and OTP validation before contract interaction.
- Transaction state UX: awaiting signature, pending confirmation, confirmed, and tx hash link.
- Wallet event listeners for account/chain changes.
- IPFS gateway fallback retry chain for retrieval.
- Shared config for contract address, expected chain, backend URL, and gateway list.

## Step-by-step rollout

1. Configure environment variables
- Copy `.env.example` values into your deployment environment.
- Required backend vars:
  - `PINATA_API_KEY`
  - `PINATA_SECRET_API_KEY`
- Recommended backend vars:
  - `REDIS_URL`
  - `OTP_TTL_SECONDS`
  - `MAX_UPLOAD_SIZE_MB`
- Optional frontend var:
  - `REACT_APP_BACKEND_BASE_URL`

2. Provision Redis
- Start a Redis instance and set `REDIS_URL`.
- Recommended for production so OTPs survive restarts and expire automatically.

3. Deploy backend updates
- Restart backend with new env vars.
- Verify startup logs include `server.started` and optionally `redis.connected`.

4. Deploy frontend updates
- Build and deploy updated React app.
- Confirm wallet connect still uses MetaMask and existing contract methods.

5. Verify send flow
- Upload encrypted file.
- Confirm recipient validation blocks invalid addresses.
- If wrong chain, verify switch prompt appears.
- Approve tx and verify status transitions:
  - awaiting signature
  - pending
  - confirmed
- Confirm tx hash link opens on Sepolia Etherscan.

6. Verify retrieve flow
- Enter invalid OTP and confirm validation blocks request.
- Enter valid OTP and confirm retrieval/decryption works.
- Confirm gateway fallback still retrieves when one gateway is slow/unavailable.
- Confirm access confirmation tx shows status + explorer link.

7. Verify backend guardrails
- Upload oversized file and confirm friendly max-size error.
- Upload disallowed MIME type and confirm friendly error with allowed types.
- Generate and verify OTP through API and confirm expiry behavior.

## Non-breaking guarantee boundaries

The following wallet-impacting areas were intentionally not changed:

- Contract ABI and method signatures
- Contract address value semantics (only centralized into shared config)
- MetaMask provider pattern (`window.ethereum` + `ethers.BrowserProvider`)

## Files changed

- `src/backend/server.js`
- `src/backend/otpStore.js`
- `src/config/web3.js`
- `src/utils/network.js`
- `src/SendPhoto.js`
- `src/RetrievePhoto.js`
- `src/App.js`
- `src/Contract.js`
- `.env.example`
- `package.json`
- `package-lock.json`
