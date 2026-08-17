# Build Angular application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build -- --configuration=production


# Run Angular application with Nginx
FROM nginx:1.27-alpine

COPY --from=build /app/dist/fantasy-poc/browser/ /usr/share/nginx/html/

COPY nginx.web.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
