// Removes the class demo (docs/PLAN-class-demo.md). Run: npm run clean:demo
//
// Deletes ONLY:
//   1. rows the seed wrote as the WebLoop account, by the ids saved in
//      scripts/demo/.seeded.json (posts, comments, likes, messages, notifications)
//      and their storage files;
//   2. everything owned by @demo.webloop.app accounts: their storage folders,
//      then the auth users (deleting a user cascades to its profile, projects,
//      tasks, posts, messages, comments, likes, reviews and group-chat rows).
// The WebLoop account itself is never deleted or edited.
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import { EMAIL_DOMAIN } from './data.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SEEDED_FILE = join(HERE, '.seeded.json');

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function loadEnv() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) fail('.env.local not found in the project folder.');
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'WEBLOOP_ADMIN_EMAIL']) if (!env[k]) fail(`Add ${k} to .env.local first.`);
  return env;
}

const env = loadEnv();
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function q(promise, what) {
  const { data, error } = await promise;
  if (error) fail(`${what}: ${error.message}`);
  return data;
}

async function allUsers() {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Listing users: ${error.message}`);
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

async function listFolder(bucket, prefix) {
  const files = [];
  const walk = async (p) => {
    const { data, error } = await sb.storage.from(bucket).list(p, { limit: 1000 });
    if (error) return;
    for (const f of data) {
      const full = p ? `${p}/${f.name}` : f.name;
      if (f.id) files.push(full); else await walk(full); // no id = folder
    }
  };
  await walk(prefix);
  return files;
}

async function main() {
  const users = await allUsers();
  const demo = users.filter((u) => (u.email ?? '').toLowerCase().endsWith(`@${EMAIL_DOMAIN}`));
  const webloop = users.find((u) => (u.email ?? '').toLowerCase() === env.WEBLOOP_ADMIN_EMAIL.toLowerCase());
  const seeded = existsSync(SEEDED_FILE) ? JSON.parse(readFileSync(SEEDED_FILE, 'utf8')) : null;

  // never touch the WebLoop account, whatever the email domain says
  const targets = demo.filter((u) => u.id !== webloop?.id);

  console.log('\nThis will permanently delete:');
  console.log(`  • ${targets.length} demo account(s): ${targets.map((u) => u.email).join(', ') || 'none'} and everything they own`);
  if (seeded) {
    console.log(`  • ${seeded.posts.length} post(s), ${seeded.comments.length} comment(s), ${seeded.reactions.length} like(s), ${seeded.messages.length} message(s) and ${seeded.notifications.length} notification(s) the seed wrote as WebLoop`);
  } else {
    console.log('  • (no scripts/demo/.seeded.json: rows written as WebLoop are left alone)');
  }
  console.log('The WebLoop account itself is kept. This cannot be undone.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Type DELETE to confirm: ')).trim();
  rl.close();
  if (answer !== 'DELETE') fail('Cancelled. Nothing was deleted.');

  // 1. WebLoop rows by saved id (only rows authored/sent by WebLoop)
  if (seeded && webloop) {
    const { data: wp } = await sb.from('profiles').select('id').eq('user_id', webloop.id).maybeSingle();
    const wid = wp?.id;
    if (wid) {
      if (seeded.comments.length) await q(sb.from('comments').delete().in('id', seeded.comments).eq('author_id', wid), 'WebLoop comments');
      if (seeded.reactions.length) await q(sb.from('reactions').delete().in('id', seeded.reactions).eq('profile_id', wid), 'WebLoop likes');
      if (seeded.messages.length) await q(sb.from('messages').delete().in('id', seeded.messages).eq('sender_id', wid), 'WebLoop messages');
      if (seeded.notifications.length) await q(sb.from('notifications').delete().in('id', seeded.notifications).eq('recipient_id', wid), 'WebLoop notifications');
      if (seeded.posts.length) await q(sb.from('posts').delete().in('id', seeded.posts).eq('author_id', wid), 'WebLoop posts');
    }
    const paths = seeded.storage.filter((p) => p.startsWith('post-media/')).map((p) => p.slice('post-media/'.length));
    if (paths.length) await sb.storage.from('post-media').remove(paths);
    console.log('  ✓ WebLoop rows removed');
  }

  // 2. Demo accounts: storage folders, then the users (cascades the rest)
  for (const u of targets) {
    for (const bucket of ['profile-media', 'post-media']) {
      const files = await listFolder(bucket, u.id);
      if (files.length) await sb.storage.from(bucket).remove(files);
    }
    const { error } = await sb.auth.admin.deleteUser(u.id);
    if (error) fail(`Deleting ${u.email}: ${error.message}`);
    console.log(`  ✓ ${u.email} deleted`);
  }

  if (existsSync(SEEDED_FILE)) unlinkSync(SEEDED_FILE);
  console.log('\n✔ Demo removed.\n');
}

main().catch((err) => fail(err?.message ?? String(err)));
