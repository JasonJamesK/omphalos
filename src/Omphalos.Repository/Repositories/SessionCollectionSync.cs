namespace Omphalos.Repository.Repositories;

/// <summary>
/// Pure, DB-agnostic helper for reconciling a session's child collection (Characters,
/// Locations, Encounters) against an incoming payload, keyed by each entity's string Id.
/// Operates only on the lists passed in — no EF Core, no DbContext.
/// </summary>
public static class SessionCollectionSync
{
    public static SyncResult<T> Diff<T>(IEnumerable<T> existing, IEnumerable<T> incoming, Func<T, string> keySelector)
    {
        throw new NotImplementedException();
    }
}

/// <summary>
/// Classification of a diff between an existing and an incoming list, keyed by Id.
/// </summary>
public class SyncResult<T>
{
    public List<T> ToAdd { get; init; } = [];
    public List<(T Existing, T Incoming)> ToUpdate { get; init; } = [];
    public List<T> ToRemove { get; init; } = [];
}
