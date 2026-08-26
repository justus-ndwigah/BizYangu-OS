# Fix: "BiasharaOS failed to start — Failed to create and initialize a new user on this system"

## Root cause
In `src/main.ts`, `startEmbeddedPostgres()` always passed `createPostgresUser: true`
to the `embedded-postgres` library. That library's `initialise()` runs
`groupadd postgres` / `useradd -g postgres postgres` whenever that option is
`true` and no existing `postgres` uid/gid is found — it does **not** first
check whether the process is actually root or even on Linux. On Windows
(and on any non-root launch), `groupadd`/`useradd` don't exist or aren't
permitted, the shell-out fails, and the library throws exactly the error
you're seeing.

The option was only ever meant to help the rare case of someone launching
the app as root on Linux (see the original comment in the code) — it just
wasn't gated behind that condition.

## Fix
`createPostgresUser` is now only set to `true` when actually running as root
on Linux:

```ts
const isLinuxRoot = process.platform === "linux"
  && typeof process.getuid === "function"
  && process.getuid() === 0;

pg = new EmbeddedPostgres({
  ...
  createPostgresUser: isLinuxRoot,
});
```

On Windows/macOS, and on a normal (non-root) Linux launch, this is `false`,
Postgres initializes as the current user like normal, and the crash goes away.

## Files in this patch
- `src/main.ts` — the real source fix. Apply this in your repo at
  `apps/desktop/src/main.ts`.
- `dist/main.cjs` — the same fix already applied to the esbuild output, in
  case you want to smoke-test immediately without rebuilding.

## How to apply and rebuild
1. Copy `src/main.ts` over your `apps/desktop/src/main.ts`.
2. From `apps/desktop`, rebuild and repackage on your dev machine (ideally Windows, for the NSIS installer):
   ```
   npm run build      # rebuilds dist/main.cjs (and web/api/preload)
   npm run dist        # electron-builder: regenerates release/ + the installer
   ```
   Rebuilding with `electron-builder` (not just `esbuild`) matters because it
   also regenerates `app.asar` / `app.asar.unpacked` correctly — the native
   Postgres binaries (`@embedded-postgres/windows-x64`, etc.) have to stay
   unpacked outside the asar archive to be spawnable, and only
   electron-builder's own asar packing (driven by your `build.asarUnpack`
   config) reliably reproduces that layout.
3. Launch the freshly built app from `release/win-unpacked/BiasharaOS.exe`
   or the new installer in `release/`.

Note: I did not hand-patch the existing `release/` build's `app.asar`,
because repacking it by hand risked breaking the native Postgres binaries
(asar can't execute binaries from inside the archive, and the exact unpack
rules electron-builder applies aren't fully reproducible with the plain
`asar` CLI). A proper `npm run dist` rebuild is the safe way to get a
corrected installer.