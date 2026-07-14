namespace Omphalos.Services.Implementations;

// Server-side image validation shared by every write path that can carry new image bytes
// (Global* create/update endpoints, session-upsert Character/Location bytes) and by the
// binary GET endpoints' Content-Type sniffing. Magic-byte detection means the served
// Content-Type always reflects the real bytes, regardless of what the client claimed.
public static class ImageValidation
{
    public const long MaxImageBytes = 5L * 1024 * 1024;

    public static bool IsRecognizedImage(byte[] data) =>
        IsPng(data) || IsGif(data) || IsJpeg(data);

    public static string DetectImageMimeType(byte[] data) =>
        IsPng(data) ? "image/png" :
        IsGif(data) ? "image/gif" :
        "image/jpeg";

    // True when data is non-null and fails the size or recognized-format check — the
    // condition write endpoints should reject with a 400. A null value (no new bytes
    // supplied) is never invalid at this layer.
    public static bool IsInvalidUpload(byte[]? data) =>
        data is not null && (data.Length > MaxImageBytes || !IsRecognizedImage(data));

    private static bool IsPng(byte[] data) => data.Length >= 2 && data[0] == 0x89 && data[1] == 0x50;
    private static bool IsGif(byte[] data) => data.Length >= 2 && data[0] == 0x47 && data[1] == 0x49;
    private static bool IsJpeg(byte[] data) => data.Length >= 2 && data[0] == 0xFF && data[1] == 0xD8;
}
