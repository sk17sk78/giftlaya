# Stage 1: Build static bundle
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
ARG VITE_API_BASE_URL
ARG VITE_STOREFRONT_URL
ARG VITE_CDN_URL
ARG VITE_THEME_COLOR=#9b1b45
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
ENV VITE_CDN_URL=$VITE_CDN_URL
ENV VITE_THEME_COLOR=$VITE_THEME_COLOR

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

