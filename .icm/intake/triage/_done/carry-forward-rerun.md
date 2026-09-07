# Stub: A carry-forward that failed partway has no button to run again

- lane: tweak
- found-by: `first-table/one-night-campaign` review, 2026-09-05
- priority: P2
- size: M

`createCampaign(dmUserId, name, carryFrom)` inserts the campaign, then carries members,
characters and gates across in three idempotent passes (`ON CONFLICT DO NOTHING`). A
failure between passes leaves the campaign standing with fewer people on it — benign, and
the same shape as every other multi-statement write on `neon-http` — but the only way to
"run the carry again" is to submit the create form again, which makes a *second* campaign.
The stub promised a re-run that finishes what a failure left; today the mend is the join
link (each missing player joins, their character comes with them).

Give the carry its own idempotent, DM-scoped entry point — `PUT
/api/campaigns/[id]/carry-from { campaignId }`, both ids checked against `dm_user_id` — and
have the create form call create then carry, keeping the created id so a retry re-runs the
carry alone. The DM's campaign page can offer the same button when the roster is shorter
than the source's.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/carry-forward-rerun.md`. Build it on a `claude/` branch and open a PR;
CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/` in the same PR.
