# 🚀 Liquid Auth Quick Start Guide

This guide will get you up and running with Algorand Foundation Liquid Auth in under 10 minutes!

## ⚡ Quick Setup (3 Commands)

```bash
# 1. Copy environment file
cp env.example .env

# 2. Start backend services
docker-compose up --build

# 3. Start frontend (in new terminal)
cd projects/algorand-frontend
npm install socket.io-client
npm run dev
```

That's it! 🎉

## 🔍 What You Get

- **Backend**: MongoDB + Redis + Liquid Auth server running on Docker
- **Frontend**: React app with Liquid Auth integration at http://localhost:5173
- **Demo Page**: Visit http://localhost:5173/liquid-auth to see the integration

## 🧪 Test the Integration

1. **Open the demo page**: http://localhost:5173/liquid-auth
2. **Try Passkey registration**: Click "Register with Passkey"
3. **Try Passkey login**: Click "Login with Passkey"
4. **Try Wallet login**: Click "Login with Algorand Wallet"

## 📁 Files Created/Modified

### Backend Files

- `docker-compose.yml` - Docker services configuration
- `Dockerfile` - Liquid Auth container build
- `healthcheck.js` - Health check script
- `env.example` - Environment variables template

### Frontend Files

- `projects/algorand-frontend/src/components/LiquidAuth.tsx` - Main auth component
- `projects/algorand-frontend/src/utils/liquidAuth.ts` - API utilities
- `projects/algorand-frontend/src/pages/LiquidAuthPage.tsx` - Demo page
- `projects/algorand-frontend/vite.config.ts` - Updated with proxy config
- `projects/algorand-frontend/src/App.tsx` - Added Liquid Auth route
- `projects/algorand-frontend/src/components/Navbar.tsx` - Added Liquid Auth link

## 🔧 Troubleshooting

### Backend Issues

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs liquid-auth
docker-compose logs mongo
docker-compose logs redis

# Restart services
docker-compose restart
```

### Frontend Issues

```bash
# Check if proxy is working
curl http://localhost:3000/health

# Check frontend console for errors
# Open browser dev tools and check Network tab
```

### Common Solutions

- **Port conflicts**: Make sure ports 3000, 5173, 27017, 6379 are free
- **Docker issues**: Run `docker system prune -a` to clean up
- **WebAuthn issues**: Use HTTPS in production, check browser support

## 📚 Next Steps

1. **Read the full guide**: `LIQUID_AUTH_SETUP.md`
2. **Customize the UI**: Modify `LiquidAuth.tsx` component
3. **Add to your app**: Import and use the `LiquidAuth` component
4. **Production setup**: Follow production deployment guide

## 🆘 Need Help?

- Check the troubleshooting section in `LIQUID_AUTH_SETUP.md`
- Review Docker and application logs
- Ensure all environment variables are set correctly
- Verify all services are running and accessible

---

**Happy coding! 🚀**
