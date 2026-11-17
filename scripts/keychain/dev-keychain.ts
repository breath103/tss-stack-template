import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { findProjectRoot, loadConfig } from "shared/config";

/**
 * `development.keychain-db`: the macOS keychain file committed at the repo root, holding
 * development-side secrets. Every read and write goes through `/usr/bin/security`, so a
 * locked keychain is unlocked in macOS's own password dialog and the password never
 * reaches this process. No method returns a secret to a caller that would print it:
 * `secrets()` exists to become a child process's environment or an SDK client's credentials.
 */
export class DevKeychain {
  private static readonly NAME = /^[A-Z][A-Z0-9_]*$/;

  // Located from the tss.json root, not `import.meta`: package scripts that import this class
  // typecheck it as CommonJS, where `import.meta` is TS1470.
  private readonly file = path.join(findProjectRoot(), "development.keychain-db");
  // Every item's account is `<tss.json project>-dev`: renaming `project` orphans every stored item.
  private readonly account = `${loadConfig().project}-dev`;

  /** `-P`: the new keychain's password is asked for by macOS, not by this process. */
  create() {
    execFileSync("security", ["create-keychain", "-P", this.file], { stdio: "inherit" });
    // A new keychain defaults to lock-on-sleep and a 5-minute idle lock. Stored in the file.
    execFileSync("security", ["set-keychain-settings", "-u", "-t", String(7 * 24 * 60 * 60), this.file], {
      stdio: "inherit",
    });
  }

  /** Stores the value typed into a macOS hidden-input dialog, replacing an existing item. */
  set(name: string) {
    DevKeychain.assertName(name);
    this.assertExists();
    const value = execFileSync(
      "osascript",
      [
        "-e",
        `text returned of (display dialog "Value for ${name}" default answer "" with hidden answer with title "Development keychain")`,
      ],
      { encoding: "utf8" }
    ).trim();
    if (value.length === 0) throw new Error("no value entered");
    this.store(name, value);
  }

  /** Stores a value this process generated (a minted access key), replacing an existing item. */
  store(name: string, value: string) {
    DevKeychain.assertName(name);
    this.assertExists();
    // `security -i` reads the command from stdin, which keeps the value out of `ps`;
    // `-X` takes it as hex, so nothing in it needs quoting.
    execFileSync("security", ["-i"], {
      input: `add-generic-password -U -a ${this.account} -s ${name} -X ${Buffer.from(value).toString("hex")} "${this.file}"\n`,
      stdio: ["pipe", "inherit", "inherit"],
    });
  }

  /** Item names. Attributes are readable while the keychain is locked. */
  names() {
    this.assertExists();
    return Array.from(
      execFileSync("security", ["dump-keychain", this.file], { encoding: "utf8" }).matchAll(
        /^\s*"svce"<blob>="(.+)"$/gm
      ),
      match => match[1]
    );
  }

  secrets(names: string[]) {
    names.forEach(DevKeychain.assertName);
    this.assertExists();
    return Object.fromEntries(
      names.map(name => [
        name,
        execFileSync("security", ["find-generic-password", "-a", this.account, "-s", name, "-w", this.file], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "inherit"],
        }).trimEnd(),
      ])
    );
  }

  private static assertName(this: void, name: string) {
    if (!DevKeychain.NAME.test(name)) {
      throw new Error(`"${name}" is not an item name: use the environment variable it becomes, e.g. ANALYTICS_API_KEY`);
    }
  }

  // `security` reads a missing keychain file as an empty one: `dump-keychain` exits 0 with
  // no items and `find-generic-password` fails "item could not be found".
  private assertExists() {
    if (!fs.existsSync(this.file)) {
      throw new Error("development.keychain-db does not exist: create it once with ./scripts/keychain_create.ts");
    }
  }
}
