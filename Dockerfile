FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# The bundle is built with the /hrd/ URL prefix, so its files are published
# under that prefix to match the asset URLs emitted by the build.
COPY --from=build /app/dist /usr/share/nginx/html/hrd
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location = /hrd {
    return 301 /hrd/;
  }

  location /hrd/ {
    try_files $uri $uri/ /hrd/index.html;
  }

  location / {
    try_files $uri /index.html;
  }
}
EOF
EXPOSE 80
