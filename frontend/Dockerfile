# Giai đoạn 1: Build ứng dụng React thành các file tĩnh (HTML/CSS/JS)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Giai đoạn 2: Dùng Nginx để phục vụ web tĩnh
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]