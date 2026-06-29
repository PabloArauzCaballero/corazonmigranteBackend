FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./src/database/migrations
COPY src/database/seeders ./src/database/seeders
COPY src/database/sequelize-cli.config.cjs ./src/database/sequelize-cli.config.cjs
COPY .sequelizerc ./
RUN mkdir -p storage/uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
