// vendored-tools-closure.test.cjs
//
// FORGE-S29 regression guard. The `.forge/tools/` vendoring (init via
// generate-tools.md, re-vendor via rebuild.md) must copy the FULL require()
// closure of the tools — including non-.cjs helper modules.
//
// The original bug: both vendoring sites copied `*.cjs` only, silently
// skipping `lib/result.js` and `lib/validate.js`. Because `store-cli.cjs`
// does a top-level `require('./lib/validate.js')`, a freshly vendored
// `.forge/tools/store-cli.cjs` was dead-on-arrival (ENOENT), and
// `collate.cjs` (KB collation) broke on `require('./lib/result.js')`.
// Pre-S29 this was invisible because tools ran from `$FORGE_ROOT/tools/`,
// which has the `.js` files; S29 moved execution onto the vendored copy.
//
// This test ties the documented vendoring behaviour to what the code
// actually requires, so an extension can never again be dropped silently.

const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const TOOLS_DIR = path.join(__dirname, "..");
const FORGE_DIR = path.join(TOOLS_DIR, "..");
const GENERATE_TOOLS_MD = path.join(FORGE_DIR, "init", "generation", "generate-tools.md");
const REBUILD_MD = path.join(FORGE_DIR, "commands", "rebuild.md");

function localRequires(file) {
	const src = fs.readFileSync(file, "utf8");
	const re = /require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
	const out = [];
	let m;
	while ((m = re.exec(src))) out.push(m[1]);
	return out;
}

function resolveLocal(fromFile, spec) {
	const base = path.resolve(path.dirname(fromFile), spec);
	for (const cand of [base, `${base}.cjs`, `${base}.js`]) {
		try {
			if (fs.statSync(cand).isFile()) return cand;
		} catch {}
	}
	return null;
}

// Entry points = every top-level non-test .cjs tool (these are the files a
// workflow invokes as `node .forge/tools/<tool>.cjs`).
const ENTRY = fs
	.readdirSync(TOOLS_DIR)
	.filter((f) => f.endsWith(".cjs") && !f.endsWith(".test.cjs"))
	.map((f) => path.join(TOOLS_DIR, f));

function closure() {
	const seen = new Set();
	const stack = [...ENTRY];
	while (stack.length) {
		const f = stack.pop();
		if (seen.has(f)) continue;
		seen.add(f);
		for (const spec of localRequires(f)) {
			const r = resolveLocal(f, spec);
			if (r && !seen.has(r)) stack.push(r);
		}
	}
	return [...seen].filter((f) => f.startsWith(TOOLS_DIR) && !f.includes("__tests__"));
}

// Extensions named in a doc's copy/enumerate directives (e.g. `*.cjs`, `*.js`).
function copyExtensions(docPath) {
	const text = fs.readFileSync(docPath, "utf8");
	const exts = new Set();
	for (const m of text.matchAll(/\*\.(cjs|js|mjs)\b/g)) exts.add(`.${m[1]}`);
	return exts;
}

describe("vendored .forge/tools/ closure completeness (FORGE-S29 regression)", () => {
	const files = closure();

	test("every local require() in the tools closure resolves to an existing file", () => {
		for (const f of files) {
			for (const spec of localRequires(f)) {
				assert.ok(
					resolveLocal(f, spec),
					`${path.relative(TOOLS_DIR, f)} requires "${spec}" which does not resolve to a file`,
				);
			}
		}
	});

	test("load-bearing .js libs are in the closure (store-cli→validate.js, collate→result.js)", () => {
		const names = new Set(files.map((f) => path.basename(f)));
		assert.ok(names.has("validate.js"), "lib/validate.js must be in the tools closure (store-cli.cjs requires it)");
		assert.ok(names.has("result.js"), "lib/result.js must be in the tools closure (collate.cjs requires it)");
	});

	test("both vendoring sites copy every extension present in the closure", () => {
		const closureExts = new Set(files.map((f) => path.extname(f)));
		for (const [label, doc] of [
			["generate-tools.md", GENERATE_TOOLS_MD],
			["rebuild.md", REBUILD_MD],
		]) {
			const covered = copyExtensions(doc);
			for (const ext of closureExts) {
				assert.ok(
					covered.has(ext),
					`${label} vendoring must copy "${ext}" files — the tools require()-closure contains ${ext} ` +
						`(e.g. lib/validate.js / lib/result.js). Copy directives found for: ${[...covered].join(", ") || "(none)"}`,
				);
			}
		}
	});
});
