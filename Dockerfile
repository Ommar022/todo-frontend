# FROM mcr.microsoft.com/windows/servercore:ltsc2022

# # Set working directory
# WORKDIR /app

# # Install Node.js using PowerShell explicitly
# RUN powershell -Command "Invoke-WebRequest -Uri https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi -OutFile node.msi; Start-Process msiexec.exe -ArgumentList '/quiet', '/norestart', '/i', 'node.msi' -Wait; Remove-Item -Force node.msi"

# # Copy only package files first for better caching
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of the application
# COPY . .

# # Disable Next.js telemetry
# ENV NEXT_TELEMETRY_DISABLED=1

# # Build Next.js
# RUN npm run build

# # Expose the port
# EXPOSE 3000

# RUN node -v && npm -v

# # Start the app
# CMD ["npm", "start"]

# Use Windows base image
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Set working directory
WORKDIR /app

# Download and install Node.js
SHELL ["powershell", "-Command"]
RUN Invoke-WebRequest -Uri https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi -OutFile node.msi ; \
    Start-Process msiexec.exe -ArgumentList '/quiet', '/norestart', '/i', 'node.msi' -Wait ; \
    Remove-Item -Force node.msi

# Switch shell back to CMD for normal commands
SHELL ["cmd", "/S", "/C"]

# Add Node.js to PATH explicitly (important for Windows)
ENV PATH="C:\\Program Files\\nodejs;%PATH%"

# Copy and install deps
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build app
RUN npm run build

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Start app
CMD ["cmd", "/c", "npm start"]

