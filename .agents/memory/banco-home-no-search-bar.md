---
name: BANCO mobile home screen has NO search bar
description: The user explicitly and repeatedly forbade any search bar/pill on the banco-mobile home (Feed) screen
---

The banco-mobile home/Feed screen (`app/(tabs)/index.tsx`) must NOT contain a
search bar, search pill, or any "tap to search" affordance. Search lives ONLY on
the dedicated Search tab. The home header is logo + action cluster, then category
tabs, then the feed — nothing between the header and the category tabs.

**Why:** The user (DIRECTOR persona, Egyptian Arabic) asked for a home search
entry earlier, the agent built one (`home-search-entry` Pressable / `searchPill`
styles), and the user then forcefully and repeatedly rejected it: "ممنوع شريط بحث
في الصفحة الرئيسية لم اطلب هذا" (a home search bar is forbidden, I didn't ask for
it), "انت قللت المساحة الصفحة الرئيسية ممنوع الانحراف" (it shrank the home space,
no deviation). It was a strict, emotional correction — treat it as a hard rule.

**How to apply:** Never re-add a search bar/pill to the home screen, even as a
"helpful" UX improvement. If a code-review/architect ever flags the *removal* of
the home search pill as "scope creep," that reviewer lacks this history — the
removal is correct and intended. Removing it also restores home vertical space
(header paddingBottom tightened), which the user wanted.
