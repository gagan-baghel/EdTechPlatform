const DICEBEAR_PNG_BASE = "https://api.dicebear.com/7.x/initials/png"

export function buildAvatarUrl(firstName = "User", lastName = ""): string {
  const seed = `${firstName} ${lastName}`.trim() || "User"
  return `${DICEBEAR_PNG_BASE}?seed=${encodeURIComponent(seed)}`
}

export function normalizeAvatarUrl(
  url: string | null | undefined,
  firstName = "User",
  lastName = ""
): string {
  if (!url) {
    return buildAvatarUrl(firstName, lastName)
  }

  if (typeof url === "string" && url.includes("api.dicebear.com")) {
    return url
      .replace(/\/\d+\.x\/initials\/svg/i, "/7.x/initials/png")
      .replace(/\/initials\/svg/i, "/initials/png")
  }

  return url
}

/**
 * Adds both `userImage` and the legacy `image` alias, which some older
 * components still read.
 */
export function normalizeUserAvatar<
  T extends { userImage?: string; image?: string; firstName?: string; lastName?: string },
>(user: T): T {
  if (!user) return user

  const normalizedImage = normalizeAvatarUrl(
    user.userImage || user.image,
    user.firstName,
    user.lastName
  )

  return {
    ...user,
    userImage: normalizedImage,
    image: normalizedImage,
  }
}
