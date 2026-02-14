# 🚀 GoLudo Deployment Guide

## Quick Setup

### 1. Backend (Railway)

1. **Create Railway Project:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `Gracing47/GoLudo`

2. **Configure Environment Variables:**
   In Railway Dashboard → Variables, add:
   ```
   PORT=3333
   SERVER_SIGNER_PRIVATE_KEY=0x_your_server_signer_key
   ```
   
   > ⚠️ **IMPORTANT**: Use a DEDICATED wallet for SERVER_SIGNER_PRIVATE_KEY, NOT your main wallet!

3. **Deploy Settings:**
   - Railway will auto-detect the `railway.json` config
   - Start command: `node backend/server.js`

4. **Get Backend URL:**
   - After deploy, copy your Railway URL (e.g., `https://goludo-production.up.railway.app`)

---

### 2. Frontend (Netlify)

1. **Create Netlify Site:**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub → Select `Gracing47/GoLudo`

2. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Configure Environment Variables:**
   In Netlify Dashboard → Site settings → Environment variables, add:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
   VITE_GOTOKEN_ADDRESS=0x937667232207904006E88888EB33aCA8E1700688
   VITE_LUDOVAULT_ADDRESS=0xd3EB7151534BBDFcb70352DA8E727B6000966E14
   ```

4. **Deploy:**
   - Click "Deploy site"
   - Get your Netlify URL (e.g., `https://goludo.netlify.app`)

---

## 🔐 Security Checklist

- [ ] `.env` file is NOT committed (check `.gitignore`)
- [ ] Use dedicated wallets for `SERVER_SIGNER_PRIVATE_KEY`
- [ ] Never share private keys in chat/email
- [ ] Use Railway/Netlify environment variables (encrypted)

---

## 🧪 Testing Production

1. Open Netlify URL in browser
2. Connect wallet (MetaMask, etc.)
3. Create a Web3 game room
4. Have teammate join from another browser
5. Verify game starts and plays correctly

---

## 📝 Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_API_URL` | Netlify | Backend API URL |
| `VITE_THIRDWEB_CLIENT_ID` | Netlify | Thirdweb dashboard ID |
| `VITE_GOTOKEN_ADDRESS` | Netlify | GO Token contract |
| `VITE_LUDOVAULT_ADDRESS` | Netlify | LudoVault contract |
| `PORT` | Railway | Server port (3333) |
| `SERVER_SIGNER_PRIVATE_KEY` | Railway | EIP-712 signer key |

---

## 🔗 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Netlify Dashboard**: https://app.netlify.com
- **Thirdweb Dashboard**: https://thirdweb.com/dashboard
- **Coston2 Faucet**: https://faucet.flare.network/coston2
