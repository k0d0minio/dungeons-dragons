// The one name the campaign chip and the server agree on (D48).
//
// Its own module, with nothing but strings in it, because both halves import
// it: the chip is a client component that writes the cookie with
// `document.cookie`, and `scope.ts` reads it through `next/headers`. Putting
// the name in `scope.ts` would drag `next/headers` into the client bundle.

/** Where the DM's chosen campaign is remembered between requests. */
export const DM_CAMPAIGN_COOKIE = 'dm_campaign'

/**
 * A year, in seconds. The cookie is a preference, not a session: a DM who
 * picks the Thursday table wants it still picked next Thursday. Nothing is
 * granted by holding it — `getActiveCampaignForDm` only ever lets it *select*
 * from the campaigns that DM already runs — so its lifetime is a convenience
 * question, not a security one.
 */
export const DM_CAMPAIGN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** The `Set-Cookie`-shaped string the chip assigns to `document.cookie`. */
export function dmCampaignCookie(campaignId: string): string {
  return `${DM_CAMPAIGN_COOKIE}=${encodeURIComponent(campaignId)}; path=/; max-age=${DM_CAMPAIGN_COOKIE_MAX_AGE}; samesite=lax`
}

/**
 * Remember the campaign the DM just picked, in the browser.
 *
 * A module function rather than a line in the chip because writing to
 * `document` from inside a component body is exactly what the React Compiler's
 * immutability rule refuses — and it is right to: this is a side effect on the
 * document, not render state. The next server render reads it back through
 * `scope.ts`.
 */
export function rememberDmCampaign(campaignId: string): void {
  document.cookie = dmCampaignCookie(campaignId)
}
