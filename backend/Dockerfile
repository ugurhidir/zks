# Use an official Node.js runtime as a parent image
# Stage 1: Builder
FROM node:18-bullseye AS builder

WORKDIR /usr/src/app

# Install build tools
RUN apt-get update && apt-get install -y build-essential python3 make --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Clean install and rebuild sqlite3 from source
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npm rebuild sqlite3 --build-from-source

# Stage 2: Runner
FROM node:18-slim

WORKDIR /usr/src/app

# Copy node_modules from builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy application source
COPY . .

# Your app binds to port 3001, so expose it
EXPOSE 3001

# Define the command to run your app
CMD [ "node", "index.js" ]
