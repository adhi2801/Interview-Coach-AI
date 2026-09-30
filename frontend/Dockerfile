# frontend/Dockerfile

FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
# SPA fallback: deep links like /replay/12 serve index.html instead of 404.
# /api/ goes to the compose `backend` service, so the login cookie is same-origin.
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location /api/ { proxy_pass http://backend:8000/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_read_timeout 90s; }\n  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
