FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Copy docker-entrypoint.sh to a path in system PATH
COPY docker-entrypoint.sh /usr/local/bin/

# Ensure the script is executable and convert Windows line endings (CRLF) to Unix (LF)
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

# Expose the default port (configurable in docker-compose / .env)
EXPOSE 4001

ENTRYPOINT ["docker-entrypoint.sh"]
