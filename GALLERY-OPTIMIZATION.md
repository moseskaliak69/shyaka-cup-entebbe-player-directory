# Gallery photo optimization

New Gallery Manager uploads accept JPG, PNG and WebP sources up to 8 MiB (the existing gallery bucket limit). The browser preserves the original and creates JPEG copies:

- Preview: longest side at most 1,600 px, at most 500 KiB.
- Thumbnail: longest side at most 400 px, at most 80 KiB.

Aspect ratio and orientation are preserved, small photos are not enlarged, and transparent sources are flattened onto white. Quality, then dimensions, are reduced further if necessary to satisfy the byte limit. Files over 40 megapixels are rejected. No paid image-transformation service is required.

## Existing photos after deployment

1. Sign in to Admin Centre and open Gallery Manager.
2. Press **Optimize existing photos** and keep the page open.
3. The progress message reports completed photos and failures. Press the same button again to retry failures; already optimized rows are skipped.

The tool downloads originals with the signed-in administrator's existing storage permissions. Each database row switches only after its thumbnail and preview uploads succeed. An `id` plus original-URL condition prevents overwriting a concurrently edited/deleted row. Signing out stops further work. Original objects are never overwritten or deleted; the viewer provides a Download original link. Failed transfers may leave unreferenced copies, but do not replace a photo's database URL. Storage requests time out after 60 seconds. Existing unsupported legacy sources remain unchanged and are reported as failures; the existing legacy-gallery recovery should run first.

## Storage layout and compatibility

The existing `gallery.image_url` points to `<original-path>.shyaka-v1/<uuid>/preview.jpg`. The companion thumbnail is `thumb.jpg` in that folder, and the original path is recoverable from the URL. No schema, RLS, bucket access, private-player media, or offline-cache allowlist changes are needed. Old clients still display the preview. Unoptimized rows still display normally.

Public images stream immediately; background cache persistence uses the service worker's `waitUntil`. Cache writes remain serialized to enforce the 40-image limit. A delayed old cache write cannot restore an image withdrawn by a newer request. Cache retention and original-media restrictions remain unchanged.

## Verification

Run `npm test` and `npm run check`.

Tests cover original preservation, file/dimension limits, conditional updates, upload failure, signed-out access, repeat optimization, loading/error states, late viewer callbacks, offline URL retention, streaming before body completion, and stale cache writes following withdrawal.

Real browser sample: an 8,372,323-byte gallery JPEG became a 270,997-byte 1,600×1,067 preview and a 35,305-byte 400×267 thumbnail. The source was not modified. This sample demonstrates compression, not a timing guarantee for every connection.
