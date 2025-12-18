# Use a base image with both Node.js and install Deno
FROM node:20-alpine

# Install Deno
RUN apk add --no-cache curl unzip
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package.json package-lock.json* ./

# Install Node dependencies (needed for Next.js build)
RUN deno install

# Copy all source files
COPY . .

# Set build-time environment variable
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

# Build the Next.js application using npm (more reliable for Next.js)
RUN deno task build

# Expose port
EXPOSE 3000

# Set runtime environment
ENV PORT=3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Start the production server
CMD ["deno", "task", "start"]
