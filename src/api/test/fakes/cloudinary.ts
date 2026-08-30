/**
 * Stand-in for the Cloudinary SDK.
 *
 * `verifyUploadedVideo` re-fetches an asset by public_id rather than trusting
 * the client, so the fake has to answer `api.resource` with something that
 * lives under the configured folder — otherwise every lecture upload under
 * test would be rejected by the real check, which is the check we want to
 * exercise rather than bypass.
 */

export interface FakeResource {
  public_id: string
  secure_url: string
  duration: number
  resource_type: string
}

/** Assets the fake knows about, keyed by public_id. */
export const cloudinaryAssets = new Map<string, FakeResource>()
export const cloudinaryDeletions: string[] = []

export function seedCloudinaryAsset(publicId: string, duration = 600): FakeResource {
  const asset: FakeResource = {
    public_id: publicId,
    secure_url: `https://res.cloudinary.com/demo/video/upload/${publicId}.mp4`,
    duration,
    resource_type: "video",
  }
  cloudinaryAssets.set(publicId, asset)
  return asset
}

export const v2 = {
  config: (_options: unknown) => undefined,
  utils: {
    api_sign_request: (params: Record<string, unknown>, secret: string) =>
      `signed:${Object.keys(params).sort().join(",")}:${secret.length}`,
  },
  api: {
    resource: async (publicId: string, _opts?: unknown) => {
      const asset = cloudinaryAssets.get(publicId)
      // The real SDK rejects for an unknown id; code under test relies on that.
      if (!asset) throw new Error("Resource not found")
      return asset
    },
  },
  uploader: {
    upload: async (path: string, opts: { folder?: string }) => {
      const publicId = `${opts.folder ?? "folder"}/${path.split("/").pop() ?? "asset"}`
      return { public_id: publicId, secure_url: `https://res.cloudinary.com/demo/image/upload/${publicId}.jpg` }
    },
    destroy: async (publicId: string, _opts?: unknown) => {
      cloudinaryDeletions.push(publicId)
      return { result: "ok" }
    },
  },
}

export function resetCloudinaryFake() {
  cloudinaryAssets.clear()
  cloudinaryDeletions.length = 0
}

export default { v2 }
