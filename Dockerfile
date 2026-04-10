# ─── STAGE 1 : Build backend deps ───────────────────────────────────────────
FROM node:20-alpine AS backend-deps
WORKDIR /app
COPY package.json ./
RUN npm install --production

# ─── STAGE 2 : Image finale ──────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Installe Node.js dans l'image Nginx alpine
RUN apk add --no-cache nodejs npm supervisor

# Copie les deps Node
WORKDIR /app
COPY --from=backend-deps /app/node_modules ./node_modules
COPY server.js ./

# Copie le frontend dans Nginx
COPY public/ /usr/share/nginx/html/

# Config Nginx (proxy /api/ → Node :3001)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Supervisor : lance Nginx + Node ensemble
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
