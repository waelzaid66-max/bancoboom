---
name: React Compiler component definition order (banco-mobile)
description: Why helper components must be defined before use in banco-mobile, and why typecheck/metro never catch the violation
---

# React Compiler requires components defined BEFORE first use

In banco-mobile, Metro runs with **React Compiler enabled** (`babel-plugin-react-compiler`). A
component referenced in JSX must be **defined textually before** the component that
renders it. A `function Foo() {}` declaration placed *after* its use throws at runtime:

`ERROR [ReferenceError: Property 'Foo' doesn't exist]`

**Why:** the compiler rewrites component function declarations into `const`-bound memoized
values at their original textual position. Normal JS function-declaration hoisting no longer
applies — the binding is in the temporal dead zone when the earlier component renders.

**How to apply:**
- Define every helper component above ITS FIRST REFERENCE — not merely before the screen.
  "First reference" includes a sibling helper, and it includes passing the component **as a
  prop reference**, e.g. `ItemSeparatorComponent={RailSeparator}` or `ListEmptyComponent={Foo}`,
  not just direct `<Foo/>` JSX. A `RailSeparator` defined just below the `Rail` that references
  it via `ItemSeparatorComponent` still throws. Order: leaf helpers → mid helpers → screen.
- This has bitten repeatedly (HeaderSpark, CompanyCard, RailSeparator-via-prop). When adding or
  moving any component, scan for every place its name appears and ensure the definition precedes
  all of them.
- This is invisible to static checks: `tsc` passes, and `metro` bundles the broken code
  successfully (the bundle builds; it just throws when executed). The ONLY signal is the
  runtime redbox in the Expo log. So after adding a component, manually confirm its
  definition precedes its usage — never rely on typecheck or a bundle smoke to catch it.
- Plain module-level data (arrays/objects, e.g. a `HOME_SORTS` const) is unaffected — only
  components the compiler transforms are subject to this ordering rule.
