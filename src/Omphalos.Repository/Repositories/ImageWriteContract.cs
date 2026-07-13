namespace Omphalos.Repository.Repositories;

// Resolves how incoming image-write intent (HasImage + the two incoming byte fields) should be
// applied against the currently-stored original/cropped bytes for an image-bearing entity.
// Shared by SessionRepository (Character/Location) and the Global* repositories so all four
// entities apply the identical 4-rule contract.
internal static class ImageWriteContract
{
    public static (byte[]? Original, byte[]? Cropped) Apply(
        bool hasImage,
        byte[]? incomingOriginal,
        byte[]? incomingCropped,
        byte[]? existingOriginal,
        byte[]? existingCropped)
    {
        if (!hasImage)
        {
            // Rule 1: image was removed entirely.
            return (null, null);
        }

        if (incomingOriginal != null)
        {
            // Rule 2: a new upload replaces both stored values (cropped may legitimately be null,
            // e.g. a GIF replacing a previously-cropped image).
            return (incomingOriginal, incomingCropped);
        }

        if (incomingCropped != null)
        {
            // Rule 3: a re-crop of the existing original — only the cropped bytes change.
            return (existingOriginal, incomingCropped);
        }

        // Rule 4: no new bytes supplied — preserve whatever is already stored.
        return (existingOriginal, existingCropped);
    }
}
