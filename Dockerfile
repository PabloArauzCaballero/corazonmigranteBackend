FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./src/database/migrations
COPY src/database/seeders ./src/database/seeders
COPY src/database/sequelize-cli.config.cjs ./src/database/sequelize-cli.config.cjs
COPY .sequelizerc ./

RUN mkdir -p storage/uploads storage/tmp

EXPOSE 3003
CMD ["node", "dist/main.js"]
