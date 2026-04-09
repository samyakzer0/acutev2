# Acute v2 Repository Overview

## What this application does

Acute is a Web3-enabled file transfer app for sending and receiving encrypted files. It combines:

- Client-side encryption in the browser
- Decentralized file storage through IPFS (via Pinata)
- Access metadata and one-time retrieval logic in an Ethereum smart contract
- A small Node/Express backend for upload and OTP generation support

From a user perspective, the app has two main actions:

1. Upload and send a file to a recipient wallet address.
2. Retrieve and decrypt a file using a one-time OTP.

## High-level flow

### Send flow

1. User selects a file in the React frontend.
2. The file is encrypted in-browser using AES (`crypto-js`), and a random encryption key is generated.
3. Encrypted payload is uploaded to the backend `/upload` endpoint.
4. Backend pins the encrypted file to IPFS through Pinata and returns an IPFS hash (CID).
5. Frontend calls backend `/generate-otp` to create a 6-digit OTP.
6. Frontend sends an on-chain transaction (`sendFile`) to store recipient, IPFS hash, encryption key, and OTP in the deployed contract.
7. User shares OTP with recipient out-of-band.

### Retrieve flow

1. Recipient opens the retrieve page and enters OTP.
2. Frontend calls smart contract `getFileByRecipient(otp)` to fetch IPFS hash and encryption key.
3. Frontend downloads encrypted content from `https://ipfs.io/ipfs/<hash>`.
4. Frontend decrypts data in-browser and reconstructs the original file for download.
5. Frontend calls smart contract `accessFile(otp)` to mark access and remove key material for one-time retrieval behavior.

## Repository structure

- `src/App.js`: Main app shell, navigation, wallet connect/disconnect UI, and routes.
- `src/SendPhoto.js`: Upload, encrypt, OTP generation, and contract send workflow.
- `src/RetrievePhoto.js`: OTP-based retrieval, decryption, and download workflow.
- `src/Contract.js`: Helper wrappers for contract interactions (provider, send, retrieve, access).
- `src/artifacts/PhotoTransfer.json`: Smart contract ABI used by the frontend.
- `src/backend/server.js`: Express API for file upload to Pinata and OTP endpoints.
- `src/Footer.js`, `src/App.css`, `src/index.css`: UI and styling.

## Frontend details

- Framework: React (Create React App setup)
- Routing: `react-router-dom`
- Wallet integration: MetaMask through `ethers` (`BrowserProvider`)
- UI/animation: `framer-motion`, `lucide-react`, custom CSS
- File handling: drag-and-drop via `react-dropzone`

Frontend routes:

- `/`: Landing page with navigation and wallet controls
- `/send-photo`: Encrypt and send file
- `/retrieve-photo`: Retrieve and decrypt file

## Backend details

Node/Express backend in `src/backend/server.js` exposes:

- `POST /upload`: accepts uploaded encrypted file, pins to Pinata, returns `ipfsHash`.
- `POST /generate-otp`: creates and stores OTP in memory by recipient.
- `POST /verify-otp`: validates OTP and returns associated hash (currently not used by frontend retrieve flow).

Additional backend behavior:

- Uploaded temp files are deleted from local disk after pinning.
- A delayed unpin task is scheduled (10 minutes) to unpin from Pinata and run `ipfs repo gc`.

## Blockchain integration

- Contract address is hardcoded in frontend modules.
- Core contract methods used:
  - `sendFile(recipient, ipfsHash, encryptionKey, otp)`
  - `getFileByRecipient(otp)`
  - `accessFile(otp)`
- The ABI is sourced from `src/artifacts/PhotoTransfer.json`.

## Runtime and deployment assumptions

- Frontend runs as a browser app (`npm start` -> CRA dev server).
- Frontend currently calls hosted backend endpoints on Render:
  - `https://acutev2.onrender.com/upload`
  - `https://acutev2.onrender.com/generate-otp`
- Retrieve flow reads from public IPFS gateway `https://ipfs.io`.
- Users need MetaMask and access to the chain/network where the hardcoded contract is deployed.

## Important observations

- Encryption key is stored on-chain during send flow. Retrieval is designed as one-time by deleting key after access.
- OTP storage in backend is in-memory and temporary.
- Backend source currently contains hardcoded Pinata API credentials, which is a security risk and should be moved to environment variables.
- `POST /verify-otp` exists but retrieve flow primarily uses contract reads directly.

## In one sentence

This repository implements a Web3 file transfer application where files are encrypted client-side, stored on IPFS, and gated by OTP plus smart-contract-controlled access for recipient retrieval.
