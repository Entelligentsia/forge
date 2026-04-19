'use strict';
// Drift guard — the Event Sidecar schema must be a subset of the Event schema.
// Any field declared on the sidecar must also exist on the canonical event
// with a compatible type and enum. If someone adds a token field to the
// sidecar without threading it through to the event, CI fails here.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.join(__dirname, '..');

const sidecar = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'event-sidecar.schema.json'), 'utf8'));
const event   = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'event.schema.json'), 'utf8'));

function typesCompatible(sidecarType, eventType) {
  const toSet = (t) => new Set(Array.isArray(t) ? t : [t]);
  const s = toSet(sidecarType);
  const e = toSet(eventType);
  for (const t of s) if (!e.has(t)) return false;
  return true;
}

describe('event-sidecar.schema.json — drift guard against event.schema.json', () => {
  test('every sidecar property exists on the event schema', () => {
    const eventProps = event.properties || {};
    for (const propName of Object.keys(sidecar.properties || {})) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(eventProps, propName),
        `sidecar property "${propName}" is not declared on event.schema.json — add it or remove from sidecar`
      );
    }
  });

  test('sidecar property types are compatible with event schema', () => {
    const eventProps = event.properties || {};
    for (const [propName, def] of Object.entries(sidecar.properties || {})) {
      if (!def.type) continue;
      const eventDef = eventProps[propName];
      if (!eventDef || !eventDef.type) continue;
      assert.ok(
        typesCompatible(def.type, eventDef.type),
        `sidecar "${propName}" type ${JSON.stringify(def.type)} incompatible with event type ${JSON.stringify(eventDef.type)}`
      );
    }
  });

  test('sidecar enum values are a subset of event enum (where event declares one)', () => {
    const eventProps = event.properties || {};
    for (const [propName, def] of Object.entries(sidecar.properties || {})) {
      if (!def.enum) continue;
      const eventDef = eventProps[propName];
      if (!eventDef || !eventDef.enum) continue;
      const eventSet = new Set(eventDef.enum);
      for (const v of def.enum) {
        assert.ok(eventSet.has(v), `sidecar "${propName}" enum value "${v}" not in event enum ${JSON.stringify(eventDef.enum)}`);
      }
    }
  });
});
