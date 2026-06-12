# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY Omphalos.sln ./
COPY src/Omphalos.Domain/Omphalos.Domain.csproj src/Omphalos.Domain/
COPY src/Omphalos.Repository/Omphalos.Repository.csproj src/Omphalos.Repository/
COPY src/Omphalos.Services/Omphalos.Services.csproj src/Omphalos.Services/
COPY src/Omphalos.Web/Omphalos.Web.csproj src/Omphalos.Web/
RUN dotnet restore
COPY src/ src/
RUN dotnet publish src/Omphalos.Web/Omphalos.Web.csproj -c Release -o /app/publish

# Stage 3: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=backend-build /app/publish .
# Copy React build into wwwroot so ASP.NET Core serves it
COPY --from=frontend-build /app/dist ./wwwroot
ENTRYPOINT ["dotnet", "Omphalos.Web.dll"]
