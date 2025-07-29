
# Use official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install PostgreSQL client
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./


# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (change if needed)
EXPOSE 3000

# Set environment variables for PostgreSQL (override in docker-compose or at runtime)
ENV PGHOST=localhost \
    PGPORT=5432 \
    PGUSER=postgres \
    PGPASSWORD=postgres \
    PGDATABASE=trackitdb

# Start the application
CMD [ "sh", "-c", "if [ \"$NODE_ENV\" = 'dev' ]; then npx nodemon app.js; else node app.js; fi" ]
