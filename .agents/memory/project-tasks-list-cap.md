---
name: project task list cap at 100
description: listProjectTasks() silently returns only the first 100 tasks; higher refs need getProjectTask
---

# listProjectTasks caps at 100

`listProjectTasks()` returns only the first 100 tasks and reports `length === 100` even when more exist. It silently omits refs > #100. Individual higher-numbered tasks (e.g. #101–#112) are still real and fetchable.

**Why:** Led to wrongly concluding tasks #101–#104 "did not exist" when a user referenced them, wasting a back-and-forth.

**How to apply:** When the total looks exactly like 100, or a user references a task number above 100, probe directly with `getProjectTask({ taskRef: "#101" })` (loop the range) instead of trusting the list length.
