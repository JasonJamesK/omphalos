using Omphalos.Domain.DTOs;

namespace Omphalos.Domain.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task SeedAdminAsync(string username, string password, CancellationToken ct = default);
}
