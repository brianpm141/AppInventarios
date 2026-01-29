# Etapa de build Angular
FROM node:24-slim AS builder

WORKDIR /app

COPY AppInventarios/package*.json ./AppInventarios/
WORKDIR /app/AppInventarios
RUN npm install
COPY AppInventarios/. .

RUN npm run build -- --configuration production

# Etapa de producción con nginx
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/AppInventarios/dist/app-inventarios/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
