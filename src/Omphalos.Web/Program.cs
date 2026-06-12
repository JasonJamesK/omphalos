using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Omphalos.Domain.Interfaces;
using Omphalos.Repository;
using Omphalos.Repository.Repositories;
using Omphalos.Services.Implementations;
using Omphalos.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<OmphalosDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repositories
builder.Services.AddScoped<ISessionRepository, SessionRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IUserService, UserService>();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };

        // Read JWT from httpOnly cookie
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue("omphalos_token", out var token))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(opts =>
    opts.AddPolicy("AdminOnly", p => p.RequireRole("Admin")));

// CORS — configured via appsettings
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(opts => opts.AddDefaultPolicy(p =>
        p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
}

var app = builder.Build();

// Auto-apply migrations and seed admin on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OmphalosDbContext>();
    await db.Database.MigrateAsync();

    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var adminUser = app.Configuration["Admin:Username"];
    var adminPass = app.Configuration["Admin:Password"];
    if (!string.IsNullOrEmpty(adminUser) && !string.IsNullOrEmpty(adminPass))
        await authService.SeedAdminAsync(adminUser, adminPass);
}

if (allowedOrigins.Length > 0) app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// API endpoints
app.MapAuthEndpoints();
app.MapSessionEndpoints();
app.MapAdminEndpoints();
app.MapSettingsEndpoints();

// Serve React SPA from wwwroot (production)
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
