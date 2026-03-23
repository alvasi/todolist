FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# FROM node:20-alpine AS development

# WORKDIR /src

# COPY package*.json ./

# RUN npm install

# COPY . .

# EXPOSE 5173

# RUN useradd app

# USER app

# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]