# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist/front/browser /app/dist

EXPOSE 4200

CMD ["serve", "-s", "dist", "-l", "4200"]
