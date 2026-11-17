// Class demo seed (docs/PLAN-class-demo.md). Run: npm run seed:demo
//
// Safe to run twice: everything is looked up first (users by email, project by
// slug, tasks by title, posts by author+title, ...) and only created if missing.
// Reads .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD,
// WEBLOOP_ADMIN_EMAIL. The service role key is never printed.
//
// The existing WebLoop account is only used: never created, never edited
// (no password, no profile change). It is added to admin_roles if missing.
// Rows written as WebLoop are listed in scripts/demo/.seeded.json so
// clean-demo.mjs can remove exactly those.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import * as D from './data.mjs';
import { avatarPng, bannerPng } from './png.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const ASSETS = join(HERE, 'assets');
const SEEDED_FILE = join(HERE, '.seeded.json');

// ------------------------------------------------------------------ env
function loadEnv() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) fail('.env.local not found in the project folder.');
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const need = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DEMO_PASSWORD', 'WEBLOOP_ADMIN_EMAIL'];
  const missing = need.filter((k) => !env[k]);
  if (missing.length) fail(`Add these to .env.local first: ${missing.join(', ')}`);
  if (Object.keys(env).some((k) => k.startsWith('VITE_') && /SERVICE_ROLE/.test(k))) {
    fail('A VITE_ variable holds a service role key. Remove it: VITE_ variables reach the browser.');
  }
  return env;
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const env = loadEnv();
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const SEED_START = new Date().toISOString();

async function q(promise, what) {
  const { data, error } = await promise;
  if (error) fail(`${what}: ${error.message}`);
  return data;
}

// ------------------------------------------------------------------ seeded ids (WebLoop rows)
const seeded = existsSync(SEEDED_FILE)
  ? JSON.parse(readFileSync(SEEDED_FILE, 'utf8'))
  : { posts: [], comments: [], reactions: [], messages: [], notifications: [], storage: [] };
// tasks / demoMessages: rows the seed created for demo accounts (clean-demo deletes them by id)
for (const k of ['tasks', 'demoMessages']) seeded[k] ??= [];
const remember = (kind, id) => { if (id && !seeded[kind].includes(id)) seeded[kind].push(id); };
const saveSeeded = () => writeFileSync(SEEDED_FILE, `${JSON.stringify(seeded, null, 2)}\n`);

// ------------------------------------------------------------------ users
async function findUserByEmail(email) {
  const target = email.toLowerCase();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Listing users: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function profileForUser(userId, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const { data } = await sb.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500)); // handle_new_user trigger
  }
  fail(`No profile row for user ${userId} (handle_new_user trigger didn't run?)`);
}

function asset(name) {
  if (!name) return null;
  const p = join(ASSETS, name);
  return existsSync(p) ? readFileSync(p) : null;
}

async function upload(bucket, path, buf, contentType = 'image/png') {
  await q(sb.storage.from(bucket).upload(path, buf, { upsert: true, contentType, cacheControl: '3600' }), `Upload ${bucket}/${path}`);
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// ------------------------------------------------------------------ main
async function main() {
  console.log('Seeding the class demo…');

  // 1. WebLoop account (existing; only looked up)
  const webloopUser = await findUserByEmail(env.WEBLOOP_ADMIN_EMAIL);
  if (!webloopUser) fail(`The WebLoop account (${env.WEBLOOP_ADMIN_EMAIL}) was not found. Sign it up in the app first; this script never creates it.`);
  const webloopProfile = await profileForUser(webloopUser.id, 1);
  const P = { webloop: webloopProfile };
  const U = { webloop: webloopUser };

  // 2. Students
  for (const s of D.students) {
    let user = await findUserByEmail(s.email);
    if (!user) {
      const { data, error } = await sb.auth.admin.createUser({
        email: s.email,
        password: env.DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { creator_type: 'student', display_name: s.display_name },
      });
      if (error) fail(`Creating ${s.email}: ${error.message}`);
      user = data.user;
      console.log(`  + user ${s.email}`);
    } else {
      console.log(`  = user ${s.email} (exists)`);
    }
    U[s.key] = user;
    P[s.key] = await profileForUser(user.id);
  }

  // 3. Profiles (handle, texts, avatar + banner)
  for (const [i, s] of D.students.entries()) {
    const prof = P[s.key];
    const clash = await q(sb.from('profiles').select('id').eq('handle', s.handle).neq('id', prof.id).maybeSingle(), 'Handle check');
    if (clash) fail(`Handle "${s.handle}" is already used by another account.`);
    const avatarUrl = await upload('profile-media', `${U[s.key].id}/avatar.png`, avatarPng(s.color, i));
    const bannerBuf = asset(s.banner) ?? bannerPng(s.color);
    const bannerUrl = await upload('profile-media', `${U[s.key].id}/banner.png`, bannerBuf);
    const patch = {
      display_name: s.display_name,
      handle: s.handle,
      headline: s.headline,
      bio: s.bio,
      university: s.university,
      major: s.major,
      education_level: s.education_level,
      graduation_year: s.graduation_year,
      experience_level: s.experience_level,
      availability: s.availability,
      location: s.location,
      languages: s.languages,
      interests: s.skills, // the app's profile builder keeps skills in `interests`
      preferred_roles: s.preferred_roles,
      github_url: s.github_url,
      linkedin_url: s.linkedin_url,
      website_url: s.website_url,
      avatar_url: `${avatarUrl}?v=1`,
      banner_url: `${bannerUrl}?v=1`,
      is_demo: false,
      creator_type: 'student',
    };
    P[s.key] = await q(sb.from('profiles').update(patch).eq('id', prof.id).select('*').single(), `Profile ${s.handle}`);
  }

  // 4. WebLoop in admin_roles (never edits its profile)
  const isAdmin = await q(sb.from('admin_roles').select('profile_id').eq('profile_id', P.webloop.id).maybeSingle(), 'Admin check');
  if (!isAdmin) {
    await q(sb.from('admin_roles').insert({ profile_id: P.webloop.id }), 'admin_roles');
    console.log('  + WebLoop added to admin_roles');
  }

  // 5. Project, skills, open role, members
  const pr = D.project;
  let project = await q(sb.from('projects').select('*').eq('slug', pr.slug).maybeSingle(), 'Project lookup');
  if (project && project.owner_id !== P[pr.owner].id) fail(`A project with slug "${pr.slug}" exists and isn't owned by the demo Hamdan.`);
  if (!project) {
    const coverBuf = asset(pr.cover);
    const cover = coverBuf ? `${await upload('profile-media', `${U[pr.owner].id}/webhub-cover.png`, coverBuf)}?v=1` : null;
    project = await q(sb.from('projects').insert({
      owner_id: P[pr.owner].id,
      title: pr.title, slug: pr.slug, summary: pr.summary, tagline: pr.tagline,
      overview: pr.overview, problem: pr.problem, target_users: pr.target_users,
      category: pr.category, difficulty: pr.difficulty, status: pr.status,
      project_type: pr.project_type, compensation: pr.compensation,
      is_remote: pr.is_remote, is_beginner_friendly: false,
      duration_weeks: pr.duration_weeks, time_commitment_hours: pr.time_commitment_hours,
      demo_url: pr.demo_url, repo_url: pr.repo_url, cover_image_url: cover,
      team_size: 1 + pr.members.length, is_demo: false,
      published_at: pr.started, created_at: pr.started, updated_at: pr.started,
    }).select('*').single(), 'Project insert');
    console.log(`  + project ${pr.slug}`);
  }

  const haveSkills = new Set((await q(sb.from('project_skills').select('name').eq('project_id', project.id), 'Skills')).map((r) => r.name));
  const newSkills = pr.skills.filter((n) => !haveSkills.has(n)).map((name) => ({ project_id: project.id, name }));
  if (newSkills.length) await q(sb.from('project_skills').insert(newSkills), 'Skills insert');

  const role = await q(sb.from('project_roles').select('id').eq('project_id', project.id).eq('title', pr.openRole.title).maybeSingle(), 'Role');
  if (!role) await q(sb.from('project_roles').insert({ project_id: project.id, title: pr.openRole.title, description: pr.openRole.description, is_open: true }), 'Role insert');

  for (const m of pr.members) {
    await q(sb.from('project_members').upsert(
      { project_id: project.id, profile_id: P[m.key].id, role: m.role, joined_at: m.joined },
      { onConflict: 'project_id,profile_id', ignoreDuplicates: true },
    ), `Member ${m.key}`);
  }

  // 6. Tasks + submissions (dates set explicitly so the contribution grid fills in)
  const existingTasks = await q(sb.from('tasks').select('id, title, acceptance_criteria, due_date').eq('project_id', project.id), 'Tasks');
  const taskId = {};
  for (const t of D.tasks) {
    const hit = existingTasks.find((x) => x.title === t.title);
    if (hit) {
      taskId[t.n] = hit.id;
      // fill acceptance criteria / due date on tasks seeded before they existed (only if still empty)
      const patch = {};
      if (t.acceptance && !hit.acceptance_criteria) patch.acceptance_criteria = t.acceptance;
      if (t.due && !hit.due_date) patch.due_date = t.due;
      if (Object.keys(patch).length) await q(sb.from('tasks').update(patch).eq('id', hit.id), `Task ${t.n} details`);
      continue;
    }
    const created = `${t.created}T09:00:00Z`;
    const updated = t.done ? `${t.done}T15:00:00Z` : t.submitted ? `${t.submitted}T15:00:00Z` : created;
    const row = await q(sb.from('tasks').insert({
      project_id: project.id,
      title: t.title,
      description: t.description,
      acceptance_criteria: t.acceptance ?? null,
      due_date: t.due ?? null,
      assignee_id: t.who ? P[t.who].id : null,
      created_by: P[pr.owner].id,
      status: t.status === 'submitted' ? 'in_progress' : t.status, // the pending submission flips it to submitted
      size: t.size,
      created_at: created,
      updated_at: updated,
    }).select('id').single(), `Task ${t.n}`);
    taskId[t.n] = row.id;
    remember('tasks', row.id);
    console.log(`  + task "${t.title}"`);

    if (t.status === 'approved' || t.status === 'changes_requested' || t.status === 'submitted') {
      const doneAt = t.done ? `${t.done}T15:00:00Z` : null;
      const subAt = t.submitted ? `${t.submitted}T15:00:00Z` : new Date(new Date(doneAt).getTime() - 864e5).toISOString();
      await q(sb.from('task_submissions').insert({
        task_id: row.id,
        submitted_by: P[t.who].id,
        evidence_url: t.evidence ?? null,
        notes: t.note ?? null,
        status: t.status === 'approved' ? 'approved' : t.status === 'changes_requested' ? 'changes_requested' : 'pending',
        rating: t.rating ?? null,
        reviewer_feedback: t.feedback ?? null,
        reviewed_at: t.status === 'approved' ? doneAt : t.status === 'changes_requested' ? new Date(new Date(subAt).getTime() + 864e5).toISOString() : null,
        created_at: subAt,
      }), `Submission ${t.n}`);
    }
  }

  // 7a. Portfolio items
  for (const s of D.students) {
    const it = s.portfolio;
    const has = await q(sb.from('portfolio_items').select('id').eq('profile_id', P[s.key].id).eq('title', it.title).maybeSingle(), 'Portfolio');
    if (!has) {
      await q(sb.from('portfolio_items').insert({
        profile_id: P[s.key].id, title: it.title, description: it.description, role: it.role,
        contributions: it.contributions, tech: it.tech, demo_url: it.demo_url, repo_url: it.repo_url,
        category: 'Web App', is_public: true, is_verified: true, is_demo: false,
        cover_image_url: project.cover_image_url,
      }), `Portfolio ${s.key}`);
    }
  }

  // 7b. Reviews
  for (const r of D.reviews) {
    const has = await q(sb.from('reviews').select('id').eq('reviewer_id', P[r.from].id).eq('reviewee_id', P[r.to].id).eq('project_id', project.id).maybeSingle(), 'Review');
    if (!has) {
      await q(sb.from('reviews').insert({
        reviewer_id: P[r.from].id, reviewee_id: P[r.to].id, project_id: project.id,
        rating: r.rating, comment: r.comment, is_verified_participation: true, created_at: r.at,
      }), 'Review insert');
    }
  }

  // 7c. 1-to-1 messages (unread only where marked, and only for Hamdan)
  for (const m of D.messages) {
    const has = await q(sb.from('messages').select('id')
      .eq('sender_id', P[m.from].id).eq('recipient_id', P[m.to].id).eq('body', m.body).eq('created_at', m.at).maybeSingle(), 'Message lookup');
    if (has) continue;
    const row = await q(sb.from('messages').insert({
      sender_id: P[m.from].id,
      recipient_id: P[m.to].id,
      body: m.body,
      project_id: project.id,
      task_id: m.task ? taskId[m.task] : null,
      is_read: !(m.unread && m.to === 'hamdan'),
      created_at: m.at,
    }).select('id').single(), 'Message insert');
    remember(m.from === 'webloop' ? 'messages' : 'demoMessages', row.id);
  }

  // Hamdan's unread 1-to-1 messages = exactly the ones marked unread in data.mjs
  // (only messages between seeded accounts; anything else is left alone).
  const seededSenders = D.messages.filter((m) => m.to === 'hamdan').map((m) => P[m.from].id);
  const inbox = await q(sb.from('messages').select('id, sender_id, body, created_at, is_read')
    .eq('recipient_id', P.hamdan.id).in('sender_id', [...new Set(seededSenders)]), 'Hamdan inbox');
  for (const row of inbox) {
    const m = D.messages.find((x) => x.to === 'hamdan' && P[x.from].id === row.sender_id && x.body === row.body
      && new Date(x.at).getTime() === new Date(row.created_at).getTime());
    if (!m) continue;
    const isRead = !m.unread;
    if (row.is_read !== isRead) await q(sb.from('messages').update({ is_read: isRead }).eq('id', row.id), 'Read state');
  }

  // 7c-2. WebHub group chat stand-up (the project's group conversation from migration 028)
  const group = await q(sb.from('conversations').select('id').eq('project_id', project.id).eq('kind', 'project').maybeSingle(), 'Group chat');
  if (group) {
    for (const g of D.groupMessages) {
      const has = await q(sb.from('messages').select('id')
        .eq('conversation_id', group.id).eq('sender_id', P[g.from].id).eq('body', g.body).maybeSingle(), 'Group message lookup');
      if (has) continue;
      const row = await q(sb.from('messages').insert({
        sender_id: P[g.from].id, recipient_id: null, conversation_id: group.id, project_id: project.id,
        body: g.body, is_read: true, created_at: g.at,
      }).select('id').single(), 'Group message');
      remember('demoMessages', row.id);
    }
  } else {
    console.log('  ! WebHub has no group chat yet (migration 028): stand-up skipped');
  }

  // 7d. Posts + images, comments, likes
  const postId = {};
  const allPosts = [...D.posts, ...D.aiGuides.map((g) => ({ ...g, author: 'webloop', image: null, guide: true }))];
  for (const p of allPosts) {
    const author = P[p.author];
    let post = await q(sb.from('posts').select('id').eq('author_id', author.id).eq('title', p.title).maybeSingle(), 'Post lookup');
    const img = asset(p.image);
    if (!post) {
      post = await q(sb.from('posts').insert({
        author_id: author.id,
        post_type: p.guide ? 'guide' : img ? 'pictures' : 'text',
        visibility: 'everyone',
        title: p.title,
        body: p.body,
        steps: p.steps ?? [],
        tags: p.tags,
        created_at: p.at,
        updated_at: p.at,
      }).select('id').single(), `Post "${p.title}"`);
      if (img) {
        const path = `${U[p.author].id}/${post.id}/0.png`;
        await upload('post-media', path, img);
        await q(sb.from('post_images').insert({ post_id: post.id, path, position: 0 }), 'Post image');
        if (p.author === 'webloop') remember('storage', `post-media/${path}`);
      }
      console.log(`  + post "${p.title}"`);
    }
    postId[p.id] = post.id;
    if (p.author === 'webloop') remember('posts', post.id);
  }

  // 7d-2. WebLoop pictures posts: each image with its own caption, command and link
  const TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  for (const pp of D.picturePosts) {
    const files = pp.images.map((im) => {
      for (const ext of Object.keys(TYPES)) {
        const buf = asset(`${pp.dir}/${im.file}.${ext}`);
        if (buf) return { ...im, buf, ext };
      }
      return null;
    }).filter(Boolean);
    let post = await q(sb.from('posts').select('id').eq('author_id', P.webloop.id).eq('title', pp.title).maybeSingle(), `Post lookup "${pp.title}"`);
    if (!post && files.length === 0) {
      console.log(`  ! "${pp.title}" skipped: add its images to scripts/demo/assets/${pp.dir}/`);
      continue;
    }
    if (!post) {
      post = await q(sb.from('posts').insert({
        author_id: P.webloop.id, post_type: 'pictures', visibility: 'everyone',
        title: pp.title, body: pp.body, steps: [], tags: pp.tags, created_at: pp.at, updated_at: pp.at,
      }).select('id').single(), `Post "${pp.title}"`);
      console.log(`  + post "${pp.title}"`);
    } else {
      await q(sb.from('posts').update({ body: pp.body, tags: pp.tags }).eq('id', post.id), `Post text "${pp.title}"`);
    }
    remember('posts', post.id);
    postId[pp.id] = post.id;
    // match images by file name (stored in the path), so new images append and old ones stay put
    const have = await q(sb.from('post_images').select('id, path, position').eq('post_id', post.id), 'Post images');
    let nextPos = have.reduce((m, h) => Math.max(m, h.position + 1), 0);
    for (const f of files) {
      const details = {
        caption: f.caption ?? null, command: f.command ?? null,
        link_url: f.link_url ?? null, link_label: f.link_url ? f.link_label ?? null : null,
      };
      const hit = have.find((h) => h.path.endsWith(`/${f.file}.${f.ext}`))
        // posts seeded before images were named by file: <post>/<position>.<ext>, in data order
        ?? have.find((h) => h.path.endsWith(`/${pp.images.indexOf(pp.images.find((x) => x.file === f.file))}.${f.ext}`));
      if (hit) { await q(sb.from('post_images').update(details).eq('id', hit.id), 'Image details'); continue; }
      const path = `${U.webloop.id}/${post.id}/${f.file}.${f.ext}`;
      await upload('post-media', path, f.buf, TYPES[f.ext]);
      remember('storage', `post-media/${path}`);
      await q(sb.from('post_images').insert({ post_id: post.id, path, position: nextPos++, ...details }), 'Image insert');
      console.log(`    + image ${f.file}`);
    }
  }

  for (const c of D.comments) {
    const pid = postId[c.post];
    const has = await q(sb.from('comments').select('id').eq('post_id', pid).eq('author_id', P[c.author].id).eq('body', c.body).maybeSingle(), 'Comment lookup');
    if (has) { if (c.author === 'webloop') remember('comments', has.id); continue; }
    const row = await q(sb.from('comments').insert({ post_id: pid, author_id: P[c.author].id, body: c.body, created_at: c.at }).select('id').single(), 'Comment');
    if (c.author === 'webloop') remember('comments', row.id);
  }

  for (const [key, who] of Object.entries(D.likes)) {
    const pid = postId[key];
    if (!pid) continue;
    const post = allPosts.find((x) => x.id === key);
    for (const k of who) {
      const has = await q(sb.from('reactions').select('id').eq('post_id', pid).eq('profile_id', P[k].id).eq('type', 'like').maybeSingle(), 'Like lookup');
      if (has) { if (k === 'webloop') remember('reactions', has.id); continue; }
      const at = new Date(new Date(post.at).getTime() + 3 * 3600e3).toISOString();
      const row = await q(sb.from('reactions').insert({ post_id: pid, profile_id: P[k].id, type: 'like', created_at: at }).select('id').single(), 'Like');
      if (k === 'webloop') remember('reactions', row.id);
    }
  }
  saveSeeded();

  // 8. Notifications the triggers just wrote: give them the event's time, then
  //    mark them read except the newest few for Hamdan.
  const recipients = Object.values(P).map((p) => p.id);
  const fresh = await q(sb.from('notifications').select('id, recipient_id, type, payload').in('recipient_id', recipients).gte('created_at', SEED_START), 'Notifications');
  const comments = await q(sb.from('comments').select('id, created_at').in('post_id', Object.values(postId)), 'Comment times');
  const commentAt = new Map(comments.map((c) => [c.id, c.created_at]));
  const likeRows = await q(sb.from('reactions').select('post_id, profile_id, created_at').in('post_id', Object.values(postId)), 'Like times');
  for (const n of fresh) {
    let at = null;
    if (n.type === 'post_comment') at = commentAt.get(n.payload?.comment_id) ?? null;
    if (n.type === 'post_like') at = likeRows.find((l) => l.post_id === n.payload?.post_id && l.profile_id === n.payload?.liker_id)?.created_at ?? null;
    if (at) await q(sb.from('notifications').update({ created_at: at }).eq('id', n.id), 'Notification time');
    if (n.recipient_id === P.webloop.id) remember('notifications', n.id);
  }
  saveSeeded();
  const forHamdan = await q(sb.from('notifications').select('id').eq('recipient_id', P.hamdan.id).order('created_at', { ascending: false }).limit(D.UNREAD_NOTIFICATIONS_FOR_HAMDAN), 'Hamdan notifications');
  const keep = new Set(forHamdan.map((n) => n.id));
  const toRead = fresh.map((n) => n.id).filter((id) => !keep.has(id));
  if (toRead.length) await q(sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', toRead), 'Mark read');

  // 9. Summary (no password, no keys)
  const total = await q(sb.from('tasks').select('status').eq('project_id', project.id), 'Summary');
  console.log('\n✔ Demo ready.\n');
  console.log('Logins (password = DEMO_PASSWORD in .env.local):');
  for (const s of D.students) console.log(`  ${s.display_name.padEnd(10)} ${s.email}   → /creators/${s.handle}`);
  console.log(`  WebLoop    ${env.WEBLOOP_ADMIN_EMAIL}   → /creators/${P.webloop.handle} (your existing password)`);
  console.log(`\nProject: /projects/${project.slug}  (${total.length} tasks, ${total.filter((t) => t.status === 'approved').length} approved)`);
  console.log(`Posts: ${Object.keys(postId).length} · WebLoop rows saved in scripts/demo/.seeded.json for clean-up\n`);
}

main().catch((err) => fail(err?.message ?? String(err)));
