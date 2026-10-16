FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --omit=dev --prefix backend

COPY backend/index.js ./backend/index.js
COPY backend/src ./backend/src
COPY frontend ./frontend

ENV UPLOADS_DIR=/data/uploads
EXPOSE 3000

CMD ["node", "backend/index.js"]
