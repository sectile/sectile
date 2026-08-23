# Bash playground

This is a real Debian `/bin/bash` session running entirely inside the browser. Use it to inspect terminal behavior without installing anything locally.

<BashPlayground />

## What this is

- A client-side Linux virtual machine with an unmodified Bash executable.
- A terminal rendered by xterm.js and connected to the VM console.
- An isolated environment with no access to the computer's shell or local files.

The VM is separate from the component examples. Component pages connect their previews directly to `@sectile/terminal`; this page exists only when an actual shell is useful. Sectile does not install a `sectile` command.

## First start

The first start registers an isolation service worker and reloads this page once. It then downloads the CheerpX runtime and streams the Debian disk blocks needed by the shell. Later starts reuse browser storage.

Inside Bash, run `bash /sectile/check-environment.sh` to inspect the real Bash and Node versions in the virtual machine.
