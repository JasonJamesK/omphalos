namespace Omphalos.Domain.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, string Username, string Role);

public record CreateUserRequest(string Username, string Password, string Role = "Player");

public record UserDto(Guid Id, string Username, string Role, DateTime CreatedAt);
