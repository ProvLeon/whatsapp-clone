FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy dependency files first (for better caching)
COPY deno.json deno.lock ./

# Copy source files
COPY *.ts ./

# Cache dependencies
RUN deno cache main.ts

# Expose the port your server uses
EXPOSE 3001

ENV PORT=3001

# Run the server with necessary permissions
#CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]
CMD ["deno", "run", "--watch" ,"-A", "main.ts"]
