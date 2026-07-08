Manage cross-repo initiatives in an ecosystem.

Initiatives are first-class records of features that span multiple
member repos. Each initiative is one markdown file under
`<ecosystem-root>/initiatives/NNNN-<slug>.md` with a small YAML
frontmatter block (id, slug, status, started, owner, repos).

This command must be run from inside an ecosystem root or any of its
member repos (the ecosystem root is discovered by walking up).

## Subcommands

```
/initiative create <slug>     Create a new initiative + activate it
/initiative status [<slug>]   Print the named (or active) initiative card
/initiative close <slug>      Populate the Close section + deactivate
/initiative list              List all initiatives in this ecosystem
```

## Steps for `create`

1. Locate the ecosystem root via the walk-up helper
   (`core/ecosystem/lib/index.js → findRoot`). If none found, abort
   with a clear message: "Not inside an ecosystem. Run `momentum
   ecosystem init` first."

2. Validate the `<slug>` matches `/^[a-z][a-z0-9-]*$/`. If not, abort.

3. Allocate the next initiative id via `nextInitiativeId(root)`
   (scans existing files for the highest `NNNN-` prefix).

4. Prompt the user (one question at a time) for:
   - **Why** — one-paragraph motivation
   - **Repos involved** — defaults to all members; allow comma-separated
     subset
   - **Owner** — defaults to git config user.name or env USER

5. Render the initiative file from
   `core/ecosystem/templates/initiative-template.md`, substituting the
   frontmatter + the user's "Why" text. Leave the
   "Per-repo contributions", "Linked decisions", "Deploy chronology"
   sections empty (they'll fill in as work lands).

6. Write the file to `<root>/initiatives/<NNNN>-<slug>.md` via
   `writeInitiative(filePath, frontmatter, content)`. This re-validates
   the frontmatter.

7. Set the slug as the active initiative:
   `setActive(root, slug)` (writes `<root>/.state/active-initiative`).

8. Print confirmation:
   ```
   Created initiative 0042-<slug>.md. Active.
   ```

## Steps for `status`

1. Resolve the target slug: argument if given; else read
   `<root>/.state/active-initiative`; else abort with
   "No active initiative. Pass <slug> or `/initiative create` first."

2. Load the file via `loadInitiative(root, slug)`. Print:
   - Frontmatter as a header block (status, owner, started, repos)
   - "Per-repo contributions" section verbatim
   - For each repo in `repos[]`, run `gh pr list --repo <owner>/<repo>
     --state open --json number,title,headRefName` (best-effort; degrade
     gracefully if `gh` not authenticated) and append a one-line
     summary per open PR.
   - For each repo, print last 3 commits via `git -C <repo-path>
     log -3 --oneline`.

3. If `<root>/.state/active-initiative` matches this slug, print:
   `(active)` in the header.

## Steps for `close`

1. Resolve slug from argument (required for close — no implicit
   "close the active one" to avoid surprises).

2. Load the initiative; abort if already `status: closed`.

3. Prompt the user (one question at a time):
   - **What shipped?**
   - **What was deferred?**
   - **What was learned?**

4. Append a populated `## Close` section (preserving any existing
   sections above it). Set frontmatter `status: closed` and
   `closed: <today>`. Write back via `writeInitiative`.

5. If this slug was active, clear `.state/active-initiative` via
   `clearActive(root)`.

6. Print confirmation:
   ```
   Closed initiative <slug>. State cleared.
   ```

## Steps for `list`

1. Read every `NNNN-*.md` file in `<root>/initiatives/`. Sort by
   numeric id ascending.

2. For each, print:
   ```
   NNNN <slug>  status  started→closed-or-‹in-progress›  repos: a, b, c
   ```

3. If `.state/active-initiative` is set, mark that row with `←active`.

## Key principles

- **Idempotent prompts** — running `/initiative create <existing-slug>`
  must refuse with a clear error, never silently overwrite.
- **Frontmatter is the source of truth** — body sections are free-form
  human writing; the agent doesn't reformat them when re-reading.
- **Cross-repo, not in-repo** — initiatives live in the ecosystem root,
  not inside any one member's `specs/`. The member-repo phases stay
  authoritative for their own work; initiatives link across them.
