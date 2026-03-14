const DICEBEAR_PNG_BASE = "https://api.dicebear.com/7.x/initials/png"

export function buildAvatarUrl(firstName = "User", lastName = "") {
  const seed = `${firstName} ${lastName}`.trim() || "User"
  return `${DICEBEAR_PNG_BASE}?seed=${encodeURIComponent(seed)}`
}

export function normalizeAvatarUrl(url, firstName = "User", lastName = "") {
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

export function normalizeUserAvatar(user) {
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
