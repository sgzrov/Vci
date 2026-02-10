FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Hathora injects HATHORA_DEFAULT_PORT at runtime
CMD ["node", "dist/index.js"]
