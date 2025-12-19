# Use Node.js Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package.json package-lock.json* ./

# Install Node dependencies
RUN npm install

# Copy all source files
COPY . .

# Build-time arguments for Next.js public environment variables
# These MUST be passed during docker build with --build-arg
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Create .env.production file with the build arguments
# Next.js reads this file during build and bakes the values into the JS bundle
RUN echo "NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}" > .env.production && \
    echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" >> .env.production

# Also set as ENV for the build process
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Set runtime environment
ENV PORT=3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Start the production server
CMD ["npm", "run", "start"]
