# Use official Node.js image
FROM node:18-slim

# Install Ghostscript (PDF compression engine)
RUN apt-get update && \
    apt-get install -y ghostscript && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Railway uses PORT automatically
EXPOSE 3000

# Start server
CMD ["node", "index.js"]
