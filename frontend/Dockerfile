FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY frontend ./frontend
COPY backend ./backend

RUN npm install -g pnpm

RUN pnpm install

WORKDIR /app/frontend

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
