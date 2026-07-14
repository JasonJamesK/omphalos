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
        var existingByKey = existing.ToDictionary(keySelector);
        var incomingByKey = incoming.ToDictionary(keySelector);

        var toRemove = existingByKey
            .Where(kvp => !incomingByKey.ContainsKey(kvp.Key))
            .Select(kvp => kvp.Value)
            .ToList();

        var toUpdate = existingByKey
            .Where(kvp => incomingByKey.ContainsKey(kvp.Key))
            .Select(kvp => (Existing: kvp.Value, Incoming: incomingByKey[kvp.Key]))
            .ToList();

        var toAdd = incomingByKey
            .Where(kvp => !existingByKey.ContainsKey(kvp.Key))
            .Select(kvp => kvp.Value)
            .ToList();

        return new SyncResult<T> { ToAdd = toAdd, ToUpdate = toUpdate, ToRemove = toRemove };
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
