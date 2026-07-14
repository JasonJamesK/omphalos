using Omphalos.Domain.Entities;
using Omphalos.Repository.Repositories;
using Xunit;

namespace Omphalos.UnitTests;

public class SessionCollectionSyncTests
{
    private static Character MakeCharacter(string id, string name) => new() { Id = id, Name = name };

    [Fact]
    public void Diff_ClassifiesAddUpdateRemove_ByKey()
    {
        var existing = new List<Character> { MakeCharacter("A", "Alice"), MakeCharacter("B", "Bob") };
        var incoming = new List<Character> { MakeCharacter("A", "Alice Updated"), MakeCharacter("C", "Carol") };

        var result = SessionCollectionSync.Diff(existing, incoming, c => c.Id);

        var removed = Assert.Single(result.ToRemove);
        Assert.Equal("B", removed.Id);

        var updated = Assert.Single(result.ToUpdate);
        Assert.Equal("A", updated.Existing.Id);
        Assert.Equal("Alice", updated.Existing.Name);
        Assert.Equal("A", updated.Incoming.Id);
        Assert.Equal("Alice Updated", updated.Incoming.Name);

        var added = Assert.Single(result.ToAdd);
        Assert.Equal("C", added.Id);
    }

    [Fact]
    public void Diff_EmptyExisting_AllIncomingAreAdds()
    {
        var existing = new List<Character>();
        var incoming = new List<Character> { MakeCharacter("A", "Alice"), MakeCharacter("B", "Bob") };

        var result = SessionCollectionSync.Diff(existing, incoming, c => c.Id);

        Assert.Empty(result.ToRemove);
        Assert.Empty(result.ToUpdate);
        Assert.Equal(2, result.ToAdd.Count);
    }

    [Fact]
    public void Diff_EmptyIncoming_AllExistingAreRemoves()
    {
        var existing = new List<Character> { MakeCharacter("A", "Alice"), MakeCharacter("B", "Bob") };
        var incoming = new List<Character>();

        var result = SessionCollectionSync.Diff(existing, incoming, c => c.Id);

        Assert.Equal(2, result.ToRemove.Count);
        Assert.Empty(result.ToUpdate);
        Assert.Empty(result.ToAdd);
    }

    [Fact]
    public void Diff_IdenticalKeys_NoAddsOrRemoves()
    {
        var existing = new List<Character> { MakeCharacter("A", "Alice"), MakeCharacter("B", "Bob") };
        var incoming = new List<Character> { MakeCharacter("A", "Alice"), MakeCharacter("B", "Bob") };

        var result = SessionCollectionSync.Diff(existing, incoming, c => c.Id);

        Assert.Empty(result.ToAdd);
        Assert.Empty(result.ToRemove);
        Assert.Equal(2, result.ToUpdate.Count);
    }
}
