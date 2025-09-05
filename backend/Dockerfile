# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install app dependencies
RUN apt-get update && apt-get install -y build-essential python3 make --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npm rebuild sqlite3 --build-from-source

# Bundle app source
COPY . .

# Your app binds to port 3001, so expose it
EXPOSE 3001

# Define the command to run your app
CMD [ "node", "index.js" ]
