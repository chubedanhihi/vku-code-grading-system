# Giai đoạn 1: Build ứng dụng React
FROM node:20-alpine AS build
WORKDIR /app

# Copy các file quản lý package trước để tận dụng cache
COPY package*.json ./

# Cài đặt thư viện (Dùng npm install kèm --legacy-peer-deps để tránh lỗi xung đột)
RUN npm install --legacy-peer-deps

# Copy toàn bộ mã nguồn còn lại
COPY . .

# Build ứng dụng thành thư mục tĩnh
RUN npm run build

# Giai đoạn 2: Dùng Nginx để phục vụ web tĩnh
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
